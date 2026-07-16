"use client";

import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Clock3,
  GitBranch,
  Menu,
  MessageSquare,
  Music,
  Pause,
  Play,
  Search,
  Sparkles,
  Upload,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { MiniPlayer } from "@/app/editor/components/mini-player";
import { useR2Music } from "@/app/editor/hooks/use-r2-music";
import { useAudioStore } from "@/app/editor/stores/audio-store";
import { cn } from "@/lib/utils";
import {
  EditorHamburgerSidebar,
  type EditorSidebarPanelKey,
} from "@/components/editor/EditorHamburgerSidebar";
import type { EditorSettingsPanelKey } from "@/app/components/editor/mobile/EditorSettingsSubmenu";
import { AwwwardsSidebar } from "@/components/sidebar/AwwwardsSidebar";
import { AnalyticsPanel } from "@/components/editor/panels/AnalyticsPanel";
import { ExportPanel } from "@/components/editor/panels/ExportPanel";
import { MotionBrainPanel } from "@/components/editor/panels/MotionBrainPanel";
import { StatusPanel } from "@/components/editor/panels/StatusPanel";
import { TimelinePanel } from "@/components/editor/panels/TimelinePanel";
import { VersionsPanel } from "@/components/editor/panels/VersionsPanel";
import { writeSelectedEditorMusicTrack } from "@/lib/editor-music-selection";
import { isStandaloneMobileEditorRoute } from "@/lib/editor-mobile-routes";
import type { R2Track } from "@/lib/music/r2-sync";

import { CommandZone } from "./CommandZone";
import { EditorTopBar } from "./EditorTopBar";
import { FocusModeToggle } from "./FocusModeToggle";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { SettingsPanel } from "./SettingsPanel";
import { PrometheusChatMobile } from "./prometheus-chat-mobile";

export function EditorRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const projectId = useMemo(
    () => getEditorProjectIdFromPathname(pathname),
    [pathname],
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] =
    useState<EditorSettingsPanelKey>("appearance");
  const [activeMobileTool, setActiveMobileTool] =
    useState<EditorSidebarPanelKey | null>(null);
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const toggleFocusMode = useCallback(
    () => setFocusMode((active) => !active),
    [],
  );
  const closeOverlays = useCallback(() => {
    setSettingsOpen(false);
    setMobileSidebarOpen(false);
    setActiveMobileTool(null);
  }, []);
  const openSettingsPanel = useCallback((panel: EditorSettingsPanelKey) => {
    setSettingsInitialTab(panel);
    setSettingsOpen(true);
  }, []);
  const openMobileSettingsPanel = useCallback(
    () => openSettingsPanel("appearance"),
    [openSettingsPanel],
  );

  if (pathname === "/editor" || isStandaloneMobileEditorRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "editor-root relative flex h-screen w-screen overflow-hidden bg-chrome-950 bg-chrome-radial text-text-primary",
        focusMode && "prometheus-focus-mode",
      )}
      data-focus-mode={focusMode ? "on" : "off"}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-chrome-radial"
        aria-hidden
      />
      <div
        id="ambient-orb-container"
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
      />

      {!focusMode && (
        <aside
          className={cn(
            "relative z-10 hidden h-full flex-shrink-0 transition-[width,transform,opacity] duration-300 ease-out md:block",
            sidebarOpen
              ? "translate-x-0 overflow-visible opacity-100"
              : "w-0 -translate-x-full overflow-hidden opacity-0",
          )}
          aria-label="Editor navigation"
        >
          <AwwwardsSidebar />
        </aside>
      )}

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        {!focusMode ? (
          <>
            <EditorTopBar
              mobileNavControl={
                <button
                  type="button"
                  onClick={openMobileSidebar}
                  className="grid size-10 place-items-center bg-transparent text-prometheus-text-primary transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prometheus-accent-cyan/70"
                  aria-label="Open editor menu"
                  aria-controls="prometheus-editor-hamburger-sidebar"
                  aria-expanded={mobileSidebarOpen}
                >
                  <Menu className="size-5" aria-hidden="true" />
                </button>
              }
              onToggleSidebar={toggleSidebar}
              sidebarOpen={sidebarOpen}
            />
            <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {children}
              {activeMobileTool ? (
                <EditorMobileToolPanel
                  activeTool={activeMobileTool}
                  projectId={projectId}
                  onClose={() => setActiveMobileTool(null)}
                  onSelectTool={setActiveMobileTool}
                />
              ) : null}
            </div>
            <CommandZone />
            <MiniPlayer />
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
            <CommandZone />
          </>
        )}
      </main>

      <FocusModeToggle active={focusMode} onToggle={toggleFocusMode} />
      <EditorHamburgerSidebar
        activePanel={activeMobileTool}
        isOpen={mobileSidebarOpen}
        onClose={closeMobileSidebar}
        onOpenPanel={setActiveMobileTool}
        onOpenSettings={openMobileSettingsPanel}
      />
      <SettingsPanel
        key={settingsInitialTab}
        focusMode={focusMode}
        initialTab={settingsInitialTab}
        onClose={() => setSettingsOpen(false)}
        onFocusModeChange={setFocusMode}
        open={settingsOpen}
      />
      <KeyboardShortcuts
        onCloseOverlays={closeOverlays}
        onToggleFocusMode={toggleFocusMode}
        onToggleSidebar={toggleSidebar}
      />
    </div>
  );
}

const mobileToolMeta: Record<
  EditorSidebarPanelKey,
  {
    description: string;
    icon: LucideIcon;
    label: string;
  }
> = {
  motion: {
    label: "Motion Brain",
    description:
      "AI motion planning, animation beats, and suggested scene transitions.",
    icon: Zap,
  },
  music: {
    label: "Music",
    description:
      "Search the mobile music library and select a soundtrack for the edit.",
    icon: Music,
  },
  analytics: {
    label: "Analytics",
    description:
      "Mobile readout for retention, hook strength, and export readiness.",
    icon: BarChart3,
  },
  timeline: {
    label: "Timeline",
    description:
      "Beat markers, transcript segments, and animation timing checkpoints.",
    icon: Clock3,
  },
  chat: {
    label: "Chat",
    description:
      "Command the edit, caption pass, and posting workflow from the project context.",
    icon: MessageSquare,
  },
  versions: {
    label: "Versions",
    description:
      "Review export checkpoints and the latest downloadable version.",
    icon: GitBranch,
  },
  status: {
    label: "Status",
    description: "Project health, source metrics, and processing progress.",
    icon: Activity,
  },
  export: {
    label: "Export",
    description: "Resolution, download, and social platform delivery.",
    icon: Upload,
  },
};

function EditorMobileToolPanel({
  activeTool,
  onClose,
  onSelectTool,
  projectId,
}: {
  activeTool: EditorSidebarPanelKey;
  onClose: () => void;
  onSelectTool: (tool: EditorSidebarPanelKey) => void;
  projectId: string | null;
}) {
  if (activeTool === "chat") {
    return <PrometheusChatMobile projectId={projectId} onClose={onClose} />;
  }

  const meta = mobileToolMeta[activeTool];
  const Icon = meta.icon;

  return (
    <aside
      className="fixed inset-0 z-40 flex flex-col overflow-hidden md:hidden"
      aria-label={`${meta.label} panel`}
    >
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[24px] saturate-[1.2]"
        aria-hidden="true"
      />
      <div className="relative z-10 mt-auto flex max-h-[min(78svh,720px)] min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-black/28 shadow-[0_-28px_90px_-38px_rgba(0,0,0,0.95)]">
        <header className="border-b border-prometheus-border-subtle px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-prometheus-text-primary">
                {meta.label}
              </h2>
              <p className="truncate text-xs text-prometheus-text-tertiary">
                {meta.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/58 transition-colors hover:bg-white/[0.07] hover:text-white"
              aria-label="Close tool panel"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] text-white">
          {activeTool === "music" ? (
            <MobileMusicTool projectId={projectId} />
          ) : null}
          {activeTool === "motion" ? (
            <MotionBrainPanel onSelectPanel={onSelectTool} />
          ) : null}
          {activeTool === "analytics" ? <AnalyticsPanel /> : null}
          {activeTool === "timeline" ? <TimelinePanel /> : null}
          {activeTool === "versions" ? <VersionsPanel /> : null}
          {activeTool === "status" ? <StatusPanel /> : null}
          {activeTool === "export" ? <ExportPanel /> : null}
        </div>
      </div>
    </aside>
  );
}

function MobileMusicTool({ projectId }: { projectId: string | null }) {
  const [query, setQuery] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const { error, isLoading, tracks } = useR2Music();
  const { currentTrack, isPlaying, pause, toggleTrack } = useAudioStore();

  const filteredTracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tracks;

    return tracks.filter((track) =>
      [track.title, track.artist, track.genre].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [query, tracks]);

  const handleUseTrack = useCallback(
    (track: R2Track) => {
      if (!projectId) return;

      pause();
      setSelectedTrackId(track.id);
      writeSelectedEditorMusicTrack(projectId, track.id);
    },
    [pause, projectId],
  );

  return (
    <section className="space-y-4" aria-label="Music library">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-prometheus-text-tertiary" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tracks..."
          className="min-h-11 w-full rounded-xl border border-prometheus-border-subtle bg-black/24 py-3 pl-10 pr-4 text-sm text-prometheus-text-primary outline-none placeholder:text-prometheus-text-tertiary focus:border-prometheus-accent-purple focus:ring-1 focus:ring-prometheus-accent-purple/35"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-prometheus-text-secondary">
          {isLoading
            ? "Syncing R2 library"
            : `${tracks.length} songs available`}
        </span>
        <button
          type="button"
          className="flex min-h-9 items-center gap-2 rounded-full border border-prometheus-accent-purple/20 bg-prometheus-accent-purple/10 px-3 text-sm font-medium text-prometheus-accent-purple transition-colors hover:bg-prometheus-accent-purple/15"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          AI Auto-Match
        </button>
      </div>

      <div className="max-h-[calc(68svh-12rem)] space-y-2 overflow-y-auto overscroll-contain pr-1 will-change-transform">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <InlineLoadingAnimation size={40} label="Loading music library" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="rounded-xl border border-prometheus-border-subtle bg-white/[0.025] p-4 text-sm text-prometheus-text-secondary">
            No tracks match that search.
          </div>
        ) : (
          filteredTracks.map((track) => (
            <MobileTrackButton
              key={track.id}
              active={currentTrack?.id === track.id}
              hasCurrentTrack={Boolean(currentTrack)}
              playing={currentTrack?.id === track.id && isPlaying}
              selected={selectedTrackId === track.id}
              track={track}
              onPlay={() => void toggleTrack(track)}
              onSelect={() => setSelectedTrackId(track.id)}
              onUse={() => handleUseTrack(track)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function MobileTrackButton({
  active,
  hasCurrentTrack,
  onPlay,
  onSelect,
  onUse,
  playing,
  selected,
  track,
}: {
  active: boolean;
  hasCurrentTrack: boolean;
  onPlay: () => void;
  onSelect: () => void;
  onUse: () => void;
  playing: boolean;
  selected: boolean;
  track: R2Track;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      className={cn(
        "group flex h-16 w-full items-center gap-3 rounded-xl border p-2 text-left transition-all duration-150",
        active && "border-l-2 border-l-prometheus-accent-cyan bg-white/5",
        selected && !active
          ? "border-prometheus-accent-purple/60 bg-prometheus-accent-purple/10 shadow-[0_0_24px_rgba(124,58,237,0.18)]"
          : "border-prometheus-border-subtle bg-white/[0.025] hover:border-white/14 hover:bg-white/[0.04]",
        hasCurrentTrack && !active && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={onPlay}
        className="group relative size-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-prometheus-accent-purple/35 via-white/[0.05] to-prometheus-accent-cyan/20"
        aria-label={playing ? `Pause ${track.title}` : `Preview ${track.title}`}
      >
        {track.coverUrl && !imageFailed ? (
          <>
            {!imageLoaded ? (
              <>
                <span className="absolute inset-0 bg-gray-700" aria-hidden="true" />
                <InlineLoadingAnimation
                  className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                  size={20}
                  label={`Loading artwork for ${track.title}`}
                />
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={track.coverUrl}
              alt=""
              className={cn(
                "h-full w-full object-cover transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white/78">
            {track.title
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/42 opacity-100 transition-opacity group-hover:bg-black/52">
          {playing ? (
            <MobileEqualizerIcon />
          ) : active ? (
            <Pause className="size-5 text-white" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 size-5 text-white" aria-hidden="true" />
          )}
        </span>
      </button>

      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-sm font-medium text-prometheus-text-primary">
          {track.title}
        </span>
        <span className="block truncate text-xs text-prometheus-text-secondary">
          {track.artist} / {track.genre}
        </span>
      </button>
      <span className="text-xs tabular-nums text-prometheus-text-tertiary">
        {formatDuration(track.duration)}
      </span>
      {selected || active ? (
        <button
          type="button"
          onClick={onUse}
          className="shrink-0 rounded-lg border border-prometheus-accent-cyan/20 bg-prometheus-accent-cyan/12 px-3 py-1.5 text-xs font-medium text-prometheus-accent-cyan transition-colors hover:bg-prometheus-accent-cyan/20"
        >
          Use Track
        </button>
      ) : null}
    </div>
  );
}

function MobileEqualizerIcon() {
  return (
    <span className="flex h-5 items-end gap-0.5" aria-hidden="true">
      <span className="h-2 w-1 animate-pulse rounded-full bg-prometheus-accent-cyan" />
      <span className="h-5 w-1 animate-pulse rounded-full bg-prometheus-accent-cyan [animation-delay:120ms]" />
      <span className="h-3 w-1 animate-pulse rounded-full bg-prometheus-accent-cyan [animation-delay:240ms]" />
    </span>
  );
}

function formatDuration(durationSec: number) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "0:00";
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.floor(durationSec % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getEditorProjectIdFromPathname(pathname: string | null) {
  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "editor" || !segments[1]) return null;
  return segments[1];
}
