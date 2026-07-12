"use client";

/**
 * Upload verification plan:
 * 1. Test a 50MB MP4 on fast WiFi. It should complete through R2 multipart upload with a smooth progress bar.
 * 2. Test a 2GB MP4 on throttled "Slow 3G" in DevTools. It should upload in 50MB parts and retry failed parts without crashing the browser.
 * 3. Test an MKV. It should pass validation and upload to R2; AVI should reject with a clear unsupported-format error.
 * 4. Test unplugging WiFi mid-upload. It should show the retrying state and retry the failed part with exponential backoff.
 * 5. Test with expired/invalid auth. The UI should surface the exact 401/403 status and response body in console logs, not a generic upload failure.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
    Video,
    Upload,
    FileUp,
    Figma,
    MonitorIcon,
    CircleUserRound,
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
    SendIcon,
    XIcon,
    Sparkles,
    Command,
    Grid3X3,
    Film,
    Music2,
    FileText,
    PanelsTopLeft,
    MessageSquare,
    ImageIcon, // Added import for ImageIcon
    Link as LinkIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BillingRequiredDialog } from "@/components/billing/billing-required-dialog";
import { GlassUploadModalView } from "@/components/ui/glass-upload-modal-view";
import { DynamicFrameLayout } from "@/components/ui/dynamic-frame-layout";
import { TextEffect } from "@/components/ui/text-effect";
import { GooeyText } from "@/components/ui/gooey-text-morphing";
import { InlineLoadingAnimation, LoadingAnimation } from "@/components/loading-animation";
import type { DynamicFrame } from "@/components/ui/dynamic-frame-layout";
import { InteractiveOrb } from "@/components/ui/interactive-orb";
import { ChatStyleSelector } from "@/components/editor/chat-style-selector";
import { STYLE_TEMPLATES } from "@/lib/styles/style-templates";
import {
    detectSourceFileKind,
    formatAspectFamily,
    formatDurationBucket,
    formatFileSize,
    formatProcessingClass,
    formatSourceProfileMetric,
    formatSourceOrientation,
    formatTimeProfile,
    formatWeightBucket,
    inspectSourceFile,
} from "@/lib/media/source-profile";
import { clearPendingEditorNavigation, getPendingEditorNavigation, markPendingEditorNavigation, rememberCurrentPathForEditorReturn } from "@/lib/editor-navigation";
import { createProcessingJob, getActiveStyleId, getMostRecentProject, startProcessing as persistStartProcessing, setActiveStyleId as persistActiveStyleId, upsertProject } from "@/lib/mock";
import { buildBillingHref, hasBillingAccess } from "@/lib/billing";
import { setSessionSourcePreview } from "@/lib/source-preview-session";
import type { SourceProfile } from "@/lib/types";
import { SourceRetentionNotice } from "./source-retention-notice";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { normalizeUxError } from "@/lib/ux/errors";
import {
    R2_MULTIPART_CLIENT_MAX_BYTES,
    R2_MULTIPART_CLIENT_PART_SIZE,
    uploadProjectSourceMultipart,
    type MultipartUploadProgress,
} from "@/lib/r2/multipart-client";

type AirtableImageArchiveResponse = {
    ok?: boolean;
    where?: string;
    error?: string;
    missing?: string[];
    items: Array<{
        id: string;
        name: string | null;
        styleKey: string | null;
        imageUrl: string | null;
        thumbUrl: string | null;
        hasAttachment: boolean;
        tags: string[];
        updatedTime: string;
    }>;
};

const AIRTABLE_STYLE_PREVIEWS_SESSION_KEY = "prometheus.airtable-style-previews.v1";
const EDITOR_NAVIGATION_FALLBACK_DELAY_MS = 6000;
const SHOULD_USE_EDITOR_NAVIGATION_FALLBACK = process.env.NODE_ENV === "production";
const DISABLE_EDITOR_BILLING_GATE = process.env.NEXT_PUBLIC_DISABLE_EDITOR_BILLING_GATE === "true";
const STUDIO_SOURCE_MAX_BYTES = R2_MULTIPART_CLIENT_MAX_BYTES;

function waitForNextPaint() {
    if (typeof window === "undefined") {
        return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
    });
}

function scheduleWhenBrowserIsIdle(task: () => void, timeout = 2000) {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    type IdleWindow = Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
    };

    const idleWindow = window as IdleWindow;

    if (typeof idleWindow.requestIdleCallback === "function") {
        const handle = idleWindow.requestIdleCallback(() => task(), { timeout });
        return () => {
            if (typeof idleWindow.cancelIdleCallback === "function") {
                idleWindow.cancelIdleCallback(handle);
            }
        };
    }

    const timeoutId = window.setTimeout(task, timeout);
    return () => window.clearTimeout(timeoutId);
}

let airtableStylePreviewsMemoryCache: Record<string, string[]> | null = null;
let airtableStylePreviewsRequest: Promise<Record<string, string[]>> | null = null;

function normalizeAirtableStylePreviewCache(value: unknown): Record<string, string[]> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const entries = Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string[]] => {
        const previewUrls = entry[1];
        return Array.isArray(previewUrls) && previewUrls.every((item) => typeof item === "string");
    });

    return Object.fromEntries(entries);
}

function readAirtableStylePreviewCache() {
    if (airtableStylePreviewsMemoryCache) return airtableStylePreviewsMemoryCache;
    if (typeof window === "undefined") return null;

    try {
        const raw = window.sessionStorage.getItem(AIRTABLE_STYLE_PREVIEWS_SESSION_KEY);
        const parsed = normalizeAirtableStylePreviewCache(raw ? JSON.parse(raw) : null);
        airtableStylePreviewsMemoryCache = parsed;
        return parsed;
    } catch {
        return null;
    }
}

function writeAirtableStylePreviewCache(cache: Record<string, string[]>) {
    airtableStylePreviewsMemoryCache = cache;
    if (typeof window === "undefined") return;

    try {
        window.sessionStorage.setItem(AIRTABLE_STYLE_PREVIEWS_SESSION_KEY, JSON.stringify(cache));
    } catch {
        // Ignore cache persistence failures and keep the in-memory fallback.
    }
}

async function fetchAirtableStylePreviewArchive() {
    const cached = readAirtableStylePreviewCache();
    if (cached) return cached;
    if (airtableStylePreviewsRequest) return airtableStylePreviewsRequest;

    airtableStylePreviewsRequest = (async () => {
        const norm = (value: string) =>
            value
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

        try {
            const res = await fetch("/api/airtable/images?limit=200", { cache: "no-store" });
            const data = (await res.json().catch(() => null)) as AirtableImageArchiveResponse | null;
            if (!res.ok) {
                if (process.env.NODE_ENV === "development") {
                    const detail = data?.error
                        ?? (Array.isArray(data?.missing) && data.missing.length > 0
                            ? `Missing env: ${data.missing.join(", ")}`
                            : `HTTP ${res.status}`);

                    console.warn(
                        `[Airtable] preview archive unavailable, falling back to local previews. ${detail}`,
                    );
                }

                writeAirtableStylePreviewCache({});
                return {};
            }

            const byStyle: Record<string, string[]> = {};

            for (const item of data?.items ?? []) {
                const styleKey = norm((item.styleKey ?? "").trim());
                const src = item.thumbUrl ?? item.imageUrl ?? null;
                if (!styleKey || !src) continue;
                (byStyle[styleKey] ??= []).push(src);
            }

            for (const key of Object.keys(byStyle)) {
                byStyle[key] = Array.from(new Set(byStyle[key])).slice(0, 3);
            }

            if (process.env.NODE_ENV === "development") {
                console.log("[Airtable] styleKeys:", Object.keys(byStyle).slice(0, 20));
            }

            writeAirtableStylePreviewCache(byStyle);
            return byStyle;
        } catch (error) {
            if (process.env.NODE_ENV === "development") {
                console.warn("Failed to load Airtable Image Archive previews, using local previews instead.", error);
            }

            writeAirtableStylePreviewCache({});
            return {};
        } finally {
            airtableStylePreviewsRequest = null;
        }
    })();

    return airtableStylePreviewsRequest;
}

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
    value?: string;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
    value,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    useLayoutEffect(() => {
        adjustHeight();
    }, [adjustHeight, value]);

    return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
    prefix: string;
}

interface CreatorMention {
    id: string;
    name: string;
    niche: string;
    keywords: string[];
}

const CREATOR_MENTIONS: CreatorMention[] = [
    { id: "ali-abdaal", name: "Ali Abdaal", niche: "productivity storytelling", keywords: ["ali", "abdaal", "study", "productivity"] },
    { id: "alex-hormozi", name: "Alex Hormozi", niche: "direct response business", keywords: ["alex", "hormozi", "offers", "business"] },
    { id: "mrbeast", name: "MrBeast", niche: "retention-heavy viral", keywords: ["mrbeast", "beast", "viral", "high energy"] },
    { id: "ireen-zhang", name: "Irene Zhang", niche: "cinematic lifestyle", keywords: ["irene", "zhang", "cinematic", "lifestyle"] },
    { id: "iman-gadzhi", name: "Iman Gadzhi", niche: "luxury business edits", keywords: ["iman", "gadzhi", "luxury", "agency"] },
    { id: "marques-brownlee", name: "Marques Brownlee", niche: "clean tech authority", keywords: ["mkbhd", "marques", "brownlee", "tech"] },
    { id: "emma-chamberlain", name: "Emma Chamberlain", niche: "raw personal vlog", keywords: ["emma", "chamberlain", "vlog", "casual"] },
    { id: "peter-mckinnon", name: "Peter McKinnon", niche: "cinematic creator cuts", keywords: ["peter", "mckinnon", "cinematic", "photo"] },
];

function findMentionContext(text: string, caret: number): { start: number; query: string } | null {
    const safeCaret = Math.max(0, Math.min(caret, text.length));
    const left = text.slice(0, safeCaret);
    const atIndex = left.lastIndexOf("@");
    if (atIndex < 0) return null;

    const charBefore = atIndex > 0 ? left[atIndex - 1] : " ";
    if (/\S/.test(charBefore)) return null;

    const query = left.slice(atIndex + 1);
    if (/[\s\n\t]/.test(query)) return null;
    return { start: atIndex, query };
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

type SlashCommandKey = "clone" | "improve";
const SLASH_COMMANDS = {
    clone: { label: "Clone Editing Style", raw: "/clone" },
    improve: { label: "Improve", raw: "/improve" },
} as const;
type ActiveSlashCommand = {
    key: SlashCommandKey;
    label: (typeof SLASH_COMMANDS)[SlashCommandKey]["label"];
    raw: (typeof SLASH_COMMANDS)[SlashCommandKey]["raw"];
};

const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
    {
        icon: ImageIcon,
        label: "Clone Editing Style",
        description: "Generate a UI from a screenshot",
        prefix: "/clone",
    },
    {
        icon: MonitorIcon,
        label: "Improve",
        description: "Improve existing UI design",
        prefix: "/improve",
    },
];

function studioActionButtonClassName(active = false) {
    return cn(
        "group premium-liquid-pill premium-kinetic-text relative inline-flex h-7 items-center gap-1.5 rounded-[8px] border px-2.5 text-[11px] font-semibold leading-none transition-all duration-200",
        active
            ? "border-white/18 bg-white/[0.09] text-white shadow-[0_10px_26px_-22px_rgba(255,255,255,0.5)]"
            : "border-white/10 bg-white/[0.028] text-white/64 hover:border-white/16 hover:bg-white/[0.052] hover:text-white/88"
    );
}

const COMPOSER_MODES = [
    { label: "Prompt", icon: MessageSquare },
    { label: "Motion", icon: Film },
    { label: "Music", icon: Music2 },
    { label: "Output", icon: Sparkles },
] as const;

const STUDIO_DISPLAY_FONT_STYLE: React.CSSProperties = {
    fontFamily: 'var(--font-migra), var(--font-vogue-display), var(--font-playfair-display), Georgia, serif',
};

interface PromptComposerSubmitPayload {
    message: string;
    activeSlashCommand: ActiveSlashCommand | null;
    creatorMentions: CreatorMention[];
}

interface PromptComposerProps {
    activeStyleId: string | null;
    activeStyleName: string | null;
    attachments: string[];
    footerAction?: React.ReactNode;
    templatesOpen: boolean;
    onClearStyle: () => void;
    onOpenTemplates: () => void;
    onOpenUpload: () => void;
    onRemoveAttachment: (index: number) => void;
    onSelectStyle: (styleId: string) => void;
    onSubmit: (payload: PromptComposerSubmitPayload) => boolean | Promise<boolean>;
    uploadStatus: UploadStatus;
    uploadProgress: number;
}

type PendingUploadKind = "video" | "image" | "audio" | "file";
type PendingUpload = {
    file: File;
    previewUrl: string;
    kind: PendingUploadKind;
    sourceProfile: SourceProfile | null;
    inspectionState: "idle" | "inspecting" | "ready" | "failed";
    inspectionError: string | null;
};

type QueuedSourceUpload = {
    file: File;
    previewKind: "video" | "image" | null;
    sourceProfile: SourceProfile | null;
};

type UploadStatus = 'idle' | 'presigning' | 'uploading' | 'paused' | 'retrying' | 'done' | 'error';

function detectUploadKind(file: File): PendingUploadKind {
    return detectSourceFileKind(file) as PendingUploadKind;
}

function validateStudioUpload(file: File) {
    const kind = detectUploadKind(file);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const supportedVideoExtensions = new Set(["mp4", "mov", "webm", "m4v", "mkv"]);
    const supportedVideoMimeTypes = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/x-matroska"]);

    if (kind !== "video" || (!supportedVideoMimeTypes.has(file.type.toLowerCase()) && !supportedVideoExtensions.has(extension))) {
        return "Unsupported format. Upload an MP4, MOV, M4V, WEBM, or MKV video.";
    }

    if (file.size > STUDIO_SOURCE_MAX_BYTES) {
        return "That video is over the 10GB Studio limit. Choose a smaller source for this workspace.";
    }

    return null;
}

function describeMultipartUploadProgress(progress: MultipartUploadProgress, fileName: string) {
    const partLabel = progress.totalParts > 1
        ? `Part ${Math.max(1, progress.currentPart)} of ${progress.totalParts}`
        : "Single part";

    if (progress.phase === "initiating") {
        return "Preparing secure multipart upload channel...";
    }

    if (progress.phase === "retrying") {
        return `Network timeout — retrying ${partLabel.toLowerCase()} for ${fileName}.`;
    }

    if (progress.phase === "completing") {
        return "Finalizing uploaded parts in Cloudflare R2...";
    }

    if (progress.phase === "aborting") {
        return "Cancelling incomplete upload and cleaning up R2 parts...";
    }

    if (progress.phase === "done") {
        return "Upload complete. Registering asset metadata...";
    }

    return `Uploading ${fileName} (${progress.percentage}%) — ${partLabel}.`;
}

const DEMO_FRAMES: DynamicFrame[] = [
    {
        id: 1,
        video: "https://static.cdn-luma.com/files/981e483f71aa764b/Company%20Thing%20Exported.mp4",
        poster: "/style-previews/iman-1.jpg",
        priority: true,
        defaultPos: { x: 0, y: 0, w: 4, h: 4 },
        mediaSize: 1,
        isHovered: false,
    },
    {
        id: 2,
        video: "https://static.cdn-luma.com/files/58ab7363888153e3/WebGL%20Exported%20(1).mp4",
        poster: "/style-previews/reels-heat-1.webp",
        defaultPos: { x: 4, y: 0, w: 4, h: 4 },
        mediaSize: 1,
        isHovered: false,
        title: "Model Preview",
        headline: "RAY 2",
        description:
            "A large-scale video model with natural, coherent motion. Handles text, image, and video prompts.",
    },
    {
        id: 3,
        video: "https://static.cdn-luma.com/files/58ab7363888153e3/Jitter%20Exported%20Poster.mp4",
        poster: "/style-previews/red-statue-1.jpg",
        defaultPos: { x: 8, y: 0, w: 4, h: 4 },
        mediaSize: 1,
        isHovered: false,
        title: "Visual Prompt",
        description: "Beautiful visuals at the speed of thought.",
    },
    {
        id: 4,
        video: "https://static.cdn-luma.com/files/58ab7363888153e3/Exported%20Web%20Video.mp4",
        poster: "/style-previews/podcast-1.jpg",
        defaultPos: { x: 0, y: 4, w: 4, h: 4 },
        mediaSize: 1,
        isHovered: false,
    },
    {
        id: 5,
        video: "https://static.cdn-luma.com/files/58ab7363888153e3/Logo%20Exported.mp4",
        poster: "/style-previews/reels-heat-2.webp",
        defaultPos: { x: 4, y: 4, w: 4, h: 4 },
        mediaSize: 1,
        isHovered: false,
    },
    {
        id: 6,
        video: "https://static.cdn-luma.com/files/58ab7363888153e3/Animation%20Exported%20(4).mp4",
        poster: "/style-previews/docs-story-1.jpg",
        defaultPos: { x: 8, y: 4, w: 4, h: 4 },
        mediaSize: 1,
        isHovered: false,
        align: "bottom-right",
        title: "Style Prompt",
        description: "@style bird like the reference",
    },
    {
        id: 7,
        video: "https://static.cdn-luma.com/files/58ab7363888153e3/Illustration%20Exported%20(1).mp4",
        poster: "/style-previews/iman-2.jpg",
        defaultPos: { x: 0, y: 8, w: 4, h: 4 },
        mediaSize: 1,
        isHovered: false,
    },
    {
        id: 8,
        video: "https://static.cdn-luma.com/files/58ab7363888153e3/Art%20Direction%20Exported.mp4",
        poster: "/style-previews/red-statue-1.jpg",
        defaultPos: { x: 4, y: 8, w: 4, h: 4 },
        mediaSize: 1,
        isHovered: false,
    },
    {
        id: 9,
        video: "https://static.cdn-luma.com/files/58ab7363888153e3/Product%20Video.mp4",
        poster: "/style-previews/docs-story-1.jpg",
        defaultPos: { x: 8, y: 8, w: 4, h: 4 },
        mediaSize: 1,
        isHovered: false,
    },
];

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    return (
      <div className={cn(
        "relative",
        containerClassName
      )}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-[border-color,background-color,box-shadow] duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "caret-violet-300",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" : "",
            className
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isFocused && (
          <motion.span
            className="pointer-events-none absolute left-3 right-3 top-1/2 h-9 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(193,147,255,0.24)_0%,rgba(193,147,255,0.08)_38%,rgba(193,147,255,0)_78%)] blur-xl"
            initial={{ opacity: 0, scaleX: 0.94 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          />
        )}
        
        {showRing && isFocused && (
          <motion.span 
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-violet-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}

        {props.onChange && (
          <div 
            className="absolute bottom-2 right-2 opacity-0 w-2 h-2 bg-violet-500 rounded-full"
            style={{
              animation: 'none',
            }}
            id="textarea-ripple"
          />
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

const PromptComposer = React.memo(function PromptComposer({
    activeStyleId,
    activeStyleName,
    attachments,
    footerAction,
    templatesOpen,
    onClearStyle,
    onOpenTemplates,
    onOpenUpload,
    onRemoveAttachment,
    onSelectStyle,
    onSubmit,
    uploadStatus,
    uploadProgress,
}: PromptComposerProps) {
    const [value, setValue] = useState("");
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(-1);
    const [activeMentionIndex, setActiveMentionIndex] = useState(0);
    const [creatorMentions, setCreatorMentions] = useState<CreatorMention[]>([]);
    const [activeSlashCommand, setActiveSlashCommand] = useState<ActiveSlashCommand | null>(null);
    const [activeComposerMode, setActiveComposerMode] = useState<(typeof COMPOSER_MODES)[number]["label"]>("Prompt");
    const [hoveredComposerMode, setHoveredComposerMode] = useState<(typeof COMPOSER_MODES)[number]["label"] | null>(null);
    const [showMentionPalette, setShowMentionPalette] = useState(false);
    const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
    const [mentionQuery, setMentionQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isDisabled = isSubmitting || (value.trim().length < 5 && !activeSlashCommand && attachments.length === 0);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
        value,
    });
    const commandPaletteRef = useRef<HTMLDivElement>(null);
    const mentionPaletteRef = useRef<HTMLDivElement>(null);

    const filteredCreatorMentions = React.useMemo(() => {
        const query = mentionQuery.trim().toLowerCase();
        if (!query) return CREATOR_MENTIONS.slice(0, 6);
        return CREATOR_MENTIONS.filter((creator) => {
            const haystack = [creator.name, creator.niche, ...creator.keywords].join(" ").toLowerCase();
            return haystack.includes(query);
        }).slice(0, 6);
    }, [mentionQuery]);
    const visibleComposerMode = hoveredComposerMode ?? activeComposerMode;
    const shouldShowComposerModes = value.length > 0 || activeSlashCommand !== null;

    useEffect(() => {
        if (activeSlashCommand) {
            setShowCommandPalette(false);
            return;
        }

        if (value.startsWith("/") && !value.includes(" ")) {
            setShowCommandPalette(true);

            const matchingSuggestionIndex = COMMAND_SUGGESTIONS.findIndex((cmd) => cmd.prefix.startsWith(value));
            setActiveSuggestion(matchingSuggestionIndex);
            return;
        }

        setShowCommandPalette(false);
    }, [activeSlashCommand, value]);

    useEffect(() => {
        if (activeSlashCommand) return;
        const match = value.match(/^\/(clone|improve)\s+/);
        if (!match) return;
        const key = match[1] as SlashCommandKey;
        setActiveSlashCommand({
            key,
            label: SLASH_COMMANDS[key].label,
            raw: SLASH_COMMANDS[key].raw,
        });
        setValue(value.replace(/^\/(clone|improve)\s+/, ""));
        adjustHeight(true);
    }, [activeSlashCommand, adjustHeight, value]);

    useEffect(() => {
        setCreatorMentions((prev) =>
            prev.filter((creator) => value.toLowerCase().includes(`@${creator.name.toLowerCase()}`))
        );
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const commandButton = document.querySelector("[data-command-button]");

            if (
                commandPaletteRef.current &&
                !commandPaletteRef.current.contains(target) &&
                !commandButton?.contains(target)
            ) {
                setShowCommandPalette(false);
            }

            if (mentionPaletteRef.current && !mentionPaletteRef.current.contains(target)) {
                setShowMentionPalette(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const updateMentionStateFromInput = React.useCallback((nextValue: string, caret: number) => {
        const context = findMentionContext(nextValue, caret);
        if (!context) {
            setShowMentionPalette(false);
            setMentionStartIndex(null);
            setMentionQuery("");
            return;
        }

        setMentionStartIndex(context.start);
        setMentionQuery(context.query);
        setShowMentionPalette(true);
        setActiveMentionIndex(0);
        setShowCommandPalette(false);
    }, []);

    const clearComposer = useCallback(() => {
        setValue("");
        setCreatorMentions([]);
        setActiveSlashCommand(null);
        setShowCommandPalette(false);
        setShowMentionPalette(false);
        setMentionStartIndex(null);
        setMentionQuery("");
        setActiveSuggestion(-1);
        setActiveMentionIndex(0);
        setActiveComposerMode("Prompt");
        setHoveredComposerMode(null);
        adjustHeight(true);
    }, [adjustHeight]);

    const selectCommandSuggestion = useCallback((index: number) => {
        const selectedCommand = COMMAND_SUGGESTIONS[index];
        if (!selectedCommand) return;
        setValue(`${selectedCommand.prefix} `);
        setShowCommandPalette(false);
        setShowMentionPalette(false);
        setActiveSuggestion(index);
    }, []);

    const selectCreatorMention = React.useCallback((creator: CreatorMention) => {
        if (mentionStartIndex === null) return;

        const textarea = textareaRef.current;
        const caret = textarea?.selectionStart ?? value.length;
        const before = value.slice(0, mentionStartIndex);
        const after = value.slice(caret);
        const mentionText = `@${creator.name}`;
        const spacer = after.startsWith(" ") || after.length === 0 ? "" : " ";
        const nextValue = `${before}${mentionText}${spacer}${after}`;
        const nextCaret = before.length + mentionText.length + spacer.length;

        setValue(nextValue);
        setCreatorMentions((prev) =>
            prev.some((item) => item.id === creator.id) ? prev : [creator, ...prev]
        );

        setShowMentionPalette(false);
        setMentionStartIndex(null);
        setMentionQuery("");

        window.requestAnimationFrame(() => {
            textarea?.focus();
            textarea?.setSelectionRange(nextCaret, nextCaret);
        });
    }, [mentionStartIndex, textareaRef, value]);

    const removeCreatorMention = useCallback((creatorId: string) => {
        setCreatorMentions((prev) => {
            const creator = prev.find((item) => item.id === creatorId);
            if (creator) {
                const escaped = creator.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                setValue((current) =>
                    current
                        .replace(new RegExp(`@${escaped}`, "gi"), "")
                        .replace(/\s{2,}/g, " ")
                        .trimStart()
                );
            }

            return prev.filter((item) => item.id !== creatorId);
        });
    }, []);

    const submitComposer = useCallback(() => {
        if (isDisabled) return;

        setIsSubmitting(true);
        void Promise.resolve(
            onSubmit({
                message: value.trim(),
                activeSlashCommand,
                creatorMentions,
            })
        ).then((handled) => {
            if (handled) {
                clearComposer();
            }
        }).catch(() => {
            return;
        }).finally(() => {
            setIsSubmitting(false);
        });
    }, [activeSlashCommand, clearComposer, creatorMentions, isDisabled, onSubmit, value]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (activeSlashCommand && e.key === "Backspace") {
            const el = textareaRef.current;
            if (el && el.selectionStart === 0 && el.selectionEnd === 0) {
                e.preventDefault();
                setActiveSlashCommand(null);
                return;
            }
        }

        if (showMentionPalette && filteredCreatorMentions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveMentionIndex((prev) => (prev < filteredCreatorMentions.length - 1 ? prev + 1 : 0));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveMentionIndex((prev) => (prev > 0 ? prev - 1 : filteredCreatorMentions.length - 1));
                return;
            }
            if (e.key === "Tab" || e.key === "Enter") {
                e.preventDefault();
                const creator = filteredCreatorMentions[activeMentionIndex] ?? filteredCreatorMentions[0];
                if (creator) {
                    selectCreatorMention(creator);
                }
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setShowMentionPalette(false);
                return;
            }
        }

        if (showCommandPalette) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveSuggestion((prev) => (prev < COMMAND_SUGGESTIONS.length - 1 ? prev + 1 : 0));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : COMMAND_SUGGESTIONS.length - 1));
                return;
            }
            if (e.key === "Tab" || e.key === "Enter") {
                e.preventDefault();
                if (activeSuggestion >= 0) {
                    selectCommandSuggestion(activeSuggestion);
                }
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setShowCommandPalette(false);
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const trimmed = value.trim();
            if (!activeSlashCommand && (trimmed === "/clone" || trimmed === "/improve")) {
                const key = trimmed.slice(1) as SlashCommandKey;
                setActiveSlashCommand({ key, label: SLASH_COMMANDS[key].label, raw: SLASH_COMMANDS[key].raw });
                setValue("");
                adjustHeight(true);
                return;
            }

            if (trimmed || activeSlashCommand) {
                submitComposer();
            }
        }
    }, [
        activeMentionIndex,
        activeSlashCommand,
        activeSuggestion,
        adjustHeight,
        filteredCreatorMentions,
        selectCommandSuggestion,
        selectCreatorMention,
        showCommandPalette,
        showMentionPalette,
        submitComposer,
        textareaRef,
        value,
    ]);

    const handleTextareaChange = useCallback((nextValue: string, caret: number) => {
        setValue(nextValue);
        updateMentionStateFromInput(nextValue, caret);
    }, [updateMentionStateFromInput]);

    return (
        <div className="space-y-4">
            <motion.div
                className="premium-motion-surface premium-telemetry-panel relative overflow-hidden rounded-[16px] border border-white/[0.13] bg-[#070707]/90 shadow-[0_40px_120px_-70px_rgba(96,190,255,0.62)] backdrop-blur-2xl"
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-10 top-0 h-36 bg-[radial-gradient(ellipse_at_top,rgba(68,163,255,0.14)_0%,rgba(68,163,255,0)_72%)]"
                />
                <AnimatePresence>
                    {showCommandPalette && (
                        <motion.div
                            ref={commandPaletteRef}
                            className="premium-telemetry-panel absolute bottom-full left-4 right-4 z-50 mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur-xl"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="bg-black/95 py-1">
                                {COMMAND_SUGGESTIONS.map((suggestion, index) => {
                                    const Icon = suggestion.icon;

                                    return (
                                        <motion.div
                                            key={suggestion.prefix}
                                            className={cn(
                                                "flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors",
                                                activeSuggestion === index
                                                    ? "bg-white/10 text-white"
                                                    : "text-white/70 hover:bg-white/5"
                                            )}
                                            onClick={() => selectCommandSuggestion(index)}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.03 }}
                                        >
                                            <div className="flex h-5 w-5 items-center justify-center text-white/60">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="font-medium">{suggestion.label}</div>
                                            <div className="ml-1 text-xs text-white/40">{suggestion.prefix}</div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                    {showMentionPalette && filteredCreatorMentions.length > 0 && (
                        <motion.div
                            ref={mentionPaletteRef}
                            className="absolute bottom-full left-4 right-4 z-[55] mb-2 overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(165deg,rgba(18,16,29,0.92)_0%,rgba(10,9,16,0.95)_100%)] shadow-[0_24px_65px_-35px_rgba(175,120,255,0.7)] backdrop-blur-xl"
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                        >
                            <div className="border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-white/50">
                                Mention Creator
                            </div>
                            <div className="max-h-64 overflow-y-auto py-1.5">
                                {filteredCreatorMentions.map((creator, index) => (
                                    <button
                                        key={creator.id}
                                        type="button"
                                        onMouseEnter={() => setActiveMentionIndex(index)}
                                        onClick={() => selectCreatorMention(creator)}
                                        className={cn(
                                            "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors",
                                            activeMentionIndex === index ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                                        )}
                                    >
                                        <div className="min-w-0 flex items-center gap-2">
                                            <CircleUserRound className="h-4 w-4 shrink-0 text-violet-200/90" />
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium text-white/92">
                                                    {creator.name}
                                                </div>
                                                <div className="truncate text-xs text-white/48">
                                                    {creator.niche}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/62">
                                            @{creator.name.split(" ")[0]?.toLowerCase()}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-3 p-4">
                    <AnimatePresence initial={false}>
                        {shouldShowComposerModes ? (
                            <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_40px_-32px_rgba(0,0,0,0.92)] backdrop-blur-md"
                            >
                                {COMPOSER_MODES.map(({ label, icon: Icon }) => {
                                    const isActive = visibleComposerMode === label;
                                    const isSelected = activeComposerMode === label;

                                    return (
                                        <motion.button
                                            key={label}
                                            type="button"
                                            onClick={() => setActiveComposerMode(label)}
                                            onMouseEnter={() => setHoveredComposerMode(label)}
                                            onMouseLeave={() => setHoveredComposerMode(null)}
                                            onFocus={() => setHoveredComposerMode(label)}
                                            onBlur={() => setHoveredComposerMode(null)}
                                            whileTap={{ scale: 0.98 }}
                                            className={cn(
                                                "relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium tracking-[0.01em] transition-colors focus-visible:outline-none",
                                                isActive ? "text-white" : "text-white/52 hover:text-white/80",
                                            )}
                                        >
                                            {isActive ? (
                                                <motion.span
                                                    layoutId="composer-mode-pill"
                                                    className="absolute inset-0 rounded-full border border-white/12 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                                    transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.82 }}
                                                />
                                            ) : null}
                                            <Icon
                                                className={cn(
                                                    "relative z-10 h-3.5 w-3.5 transition-colors",
                                                    isActive ? "text-white/90" : isSelected ? "text-white/58" : "text-white/38",
                                                )}
                                            />
                                            <span className="relative z-10">{label}</span>
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        ) : null}
                    </AnimatePresence>

                    <AnimatePresence>
                        {activeSlashCommand && (
                            <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="flex items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2"
                            >
                                <div className="min-w-0 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-violet-200/90" />
                                    <div className="min-w-0">
                                        <div className="truncate text-xs font-medium text-white/90">
                                            {activeSlashCommand.label}
                                        </div>
                                        <div className="truncate text-[11px] text-white/45">
                                            {activeSlashCommand.raw}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveSlashCommand(null)}
                                    className="rounded-lg p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
                                    aria-label="Remove command"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {creatorMentions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-300/25 bg-[linear-gradient(165deg,rgba(109,61,188,0.22)_0%,rgba(61,33,107,0.15)_100%)] px-3 py-2"
                            >
                                {creatorMentions.map((creator) => (
                                    <div
                                        key={creator.id}
                                        className="group inline-flex items-center gap-2 rounded-full border border-violet-200/30 bg-black/30 px-3 py-1 text-xs text-violet-100 shadow-[0_0_0_1px_rgba(168,85,247,0.22)]"
                                    >
                                        <CircleUserRound className="h-3.5 w-3.5 text-violet-200/90" />
                                        <span className="font-medium">@{creator.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeCreatorMention(creator.id)}
                                            className="text-violet-200/65 transition-colors hover:text-white"
                                            aria-label={`Remove ${creator.name} mention`}
                                        >
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => {
                            handleTextareaChange(
                                e.target.value,
                                e.target.selectionStart ?? e.target.value.length
                            );
                        }}
                        onSelect={(e) => {
                            const target = e.currentTarget;
                            updateMentionStateFromInput(target.value, target.selectionStart ?? target.value.length);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Prometheus to shape the cut..."
                        containerClassName="w-full"
                        className={cn(
                            "min-h-[60px] w-full resize-none px-4 py-3",
                            "border-none bg-transparent",
                            "text-[15px] font-normal leading-7 tracking-[0.008em] text-white",
                            "focus:outline-none",
                            "placeholder:text-white/30"
                        )}
                        style={{
                            overflow: "hidden",
                            fontFamily:
                                '"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",sans-serif',
                        }}
                        showRing={false}
                    />
                </div>

                <AnimatePresence>
                    {(attachments.length > 0 || !!activeStyleName) && (
                        <motion.div
                            className="flex flex-wrap gap-2 px-4 pb-3"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            {activeStyleName && (
                                <motion.div
                                    className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-white/80"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                >
                                    <span>Style: {activeStyleName}</span>
                                    <button
                                        type="button"
                                        onClick={onClearStyle}
                                        className="text-white/40 transition-colors hover:text-white"
                                        aria-label="Clear style"
                                    >
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                </motion.div>
                            )}
                            {attachments.map((file, index) => (
                                <motion.div
                                    key={`${file}-${index}`}
                                    className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs text-white/70"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                >
                                    <span>{file}</span>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveAttachment(index)}
                                        className="text-white/40 transition-colors hover:text-white"
                                    >
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative flex items-center justify-between gap-4 border-t border-white/[0.08] p-4">
                    <div className="flex items-center gap-3">
                        <motion.button
                            type="button"
                            onClick={onOpenUpload}
                            whileTap={{ scale: 0.94 }}
                            className="group premium-icon-orbit relative rounded-lg p-2 text-white/40 transition-colors hover:text-white/90"
                            title="Upload source"
                        >
                            <FileUp className="h-4 w-4" />
                            <motion.span
                                className="absolute inset-0 rounded-lg bg-white/[0.05] opacity-0 transition-opacity group-hover:opacity-100"
                                layoutId="button-highlight"
                            />
                        </motion.button>
                        <motion.button
                            type="button"
                            onClick={onOpenTemplates}
                            whileTap={{ scale: 0.94 }}
                            className={cn(
                                "group premium-icon-orbit relative rounded-lg p-2 text-white/40 transition-colors hover:text-white/90",
                                templatesOpen && "bg-white/10 text-white/90"
                            )}
                            title="Templates and styles"
                        >
                            <Grid3X3 className="h-4 w-4" />
                            <motion.span
                                className="absolute inset-0 rounded-lg bg-white/[0.05] opacity-0 transition-opacity group-hover:opacity-100"
                                layoutId="button-highlight"
                            />
                        </motion.button>
                        <ChatStyleSelector
                            activeStyleId={activeStyleId}
                            compact
                            onSelectStyle={(template) => onSelectStyle(template.id)}
                            className="shrink-0"
                        />
                        <motion.button
                            type="button"
                            data-command-button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCommandPalette((prev) => !prev);
                            }}
                            whileTap={{ scale: 0.94 }}
                            className={cn(
                                "group premium-icon-orbit relative rounded-lg p-2 text-white/40 transition-colors hover:text-white/90",
                                showCommandPalette && "bg-white/10 text-white/90"
                            )}
                        >
                            <Command className="h-4 w-4" />
                            <motion.span
                                className="absolute inset-0 rounded-lg bg-white/[0.05] opacity-0 transition-opacity group-hover:opacity-100"
                                layoutId="button-highlight"
                            />
                        </motion.button>
                    </div>

                    <motion.button
                        type="button"
                        onClick={submitComposer}
                        whileHover={!isDisabled ? { scale: 1.05 } : undefined}
                        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                        disabled={isDisabled}
                        aria-disabled={isDisabled}
                        className={cn(
                            "premium-liquid-pill flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300",
                            isDisabled
                                ? "opacity-40 cursor-not-allowed bg-white/[0.05] text-white/40"
                                : uploadStatus === 'error'
                                ? "bg-red-500 text-white shadow-lg shadow-red-500/20 opacity-100 cursor-pointer"
                                : "bg-white text-[#0A0A0B] shadow-[0_0_20px_rgba(255,255,255,0.15)] opacity-100 cursor-pointer"
                        )}
                    >
                        {uploadStatus === 'error' ? (
                            <ArrowUpIcon className="h-4 w-4" />
                        ) : isSubmitting ? (
                            <InlineLoadingAnimation size={16} label="Sending request" />
                        ) : (
                            <SendIcon className="h-4 w-4" />
                        )}
                        <span>
                            {uploadStatus === 'error' ? "Retry Upload" : isSubmitting ? "Sending..." : "Send"}
                        </span>
                    </motion.button>
                </div>

                <SourceRetentionNotice variant="minimal" />
            </motion.div>

            <div className="flex flex-wrap items-center justify-center gap-2">
                {COMMAND_SUGGESTIONS.map((suggestion, index) => {
                    const Icon = suggestion.icon;

                    return (
                        <motion.button
                            key={suggestion.prefix}
                            type="button"
                            onClick={() => selectCommandSuggestion(index)}
                            className={studioActionButtonClassName()}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{suggestion.label}</span>
                        </motion.button>
                    );
                })}
                {footerAction}
            </div>
        </div>
    );
});

function StudioCinematicMarqueeRails({
    activeStyleId,
    onSelectStyle,
}: {
    activeStyleId: string | null;
    onSelectStyle: (styleId: string) => void;
}) {
    const railItems = React.useMemo(() => {
        return STYLE_TEMPLATES.flatMap((template) => {
            const images = template.previewImages.length ? template.previewImages : [""];
            return images.slice(0, 2).map((src, index) => ({
                id: `${template.id}-${index}`,
                styleId: template.id,
                name: template.name,
                description: template.description,
                src,
            }));
        });
    }, []);
    const upperRail = [...railItems, ...railItems];
    const lowerRail = [...railItems].reverse().concat([...railItems].reverse());

    const renderRailItem = (item: (typeof railItems)[number], index: number) => {
        const selected = item.styleId === activeStyleId;

        return (
            <button
                key={`${item.id}-${index}`}
                type="button"
                aria-label={`Select ${item.name} animation style`}
                onClick={() => onSelectStyle(item.styleId)}
                className={cn(
                    "group premium-motion-surface relative h-24 w-44 shrink-0 overflow-hidden rounded-[18px] border bg-white/[0.035] text-left shadow-[0_22px_48px_-34px_rgba(0,0,0,0.92)] transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ff6e3]/35 sm:h-28 sm:w-56",
                    selected
                        ? "border-[#9ff6e3]/42 bg-[#9ff6e3]/[0.08]"
                        : "border-white/10 hover:border-white/18 hover:bg-white/[0.055]",
                )}
            >
                {item.src ? (
                    <Image
                        src={item.src}
                        alt=""
                        fill
                        sizes="224px"
                        className="object-cover opacity-75 transition duration-300 group-hover:scale-105 group-hover:opacity-95"
                    />
                ) : (
                    <div className="grid h-full w-full place-items-center text-white/26">
                        <ImageIcon className="h-5 w-5" />
                    </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.82)_100%)]" />
                <div className="absolute inset-x-3 bottom-3">
                    <div className="truncate text-xs font-semibold text-white/92">{item.name}</div>
                    <div className="mt-1 line-clamp-1 text-[10px] text-white/48">{item.description}</div>
                </div>
                <div
                    aria-hidden
                    className={cn(
                        "absolute left-3 top-3 h-1.5 w-1.5 rounded-full transition-colors",
                        selected ? "bg-[#9ff6e3] shadow-[0_0_18px_rgba(159,246,227,0.72)]" : "bg-white/32",
                    )}
                />
            </button>
        );
    };

    return (
        <div className="studio-cinematic-rails premium-telemetry-panel premium-vignette-edges group relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-black/[0.22] py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <style>{`
                @keyframes studio-marquee-right {
                    from { transform: translateX(-50%); }
                    to { transform: translateX(0%); }
                }

                @keyframes studio-marquee-left {
                    from { transform: translateX(0%); }
                    to { transform: translateX(-50%); }
                }

                .studio-cinematic-rail-track {
                    width: max-content;
                    animation-duration: 38s;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    will-change: transform;
                }

                .studio-cinematic-rail-track[data-direction="right"] {
                    animation-name: studio-marquee-right;
                }

                .studio-cinematic-rail-track[data-direction="left"] {
                    animation-name: studio-marquee-left;
                }

                .studio-cinematic-rails:hover .studio-cinematic-rail-track,
                .studio-cinematic-rails:focus-within .studio-cinematic-rail-track {
                    animation-play-state: paused;
                }

                @media (prefers-reduced-motion: reduce) {
                    .studio-cinematic-rail-track {
                        animation: none;
                        transform: none;
                    }
                }
            `}</style>
            <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0)_100%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-[linear-gradient(270deg,#050505_0%,rgba(5,5,5,0)_100%)]"
            />
            <div className="flex studio-cinematic-rail-track gap-3 px-3" data-direction="left">
                {upperRail.map(renderRailItem)}
            </div>
            <div className="mt-3 flex studio-cinematic-rail-track gap-3 px-3" data-direction="right">
                {lowerRail.map(renderRailItem)}
            </div>
        </div>
    );
}

export function VideoUploadInterface() {
    const router = useRouter();
    const [showFileUploadModal, setShowFileUploadModal] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const uploadInspectionRunRef = useRef(0);
    const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
    const [queuedSourceUpload, setQueuedSourceUpload] = useState<QueuedSourceUpload | null>(null);
    const [addSourceMode, setAddSourceMode] = useState<"link" | "upload">("link");
    const [isSourceDragOver, setIsSourceDragOver] = useState(false);
    const sourceFileInputRef = useRef<HTMLInputElement>(null);
    const [attachments, setAttachments] = useState<string[]>([]);
    const submitCooldownTimerRef = useRef<number | null>(null);
    const submitLockRef = useRef(false);
    const launchNavigationTimerRef = useRef<number | null>(null);

    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [airtableStylePreviews, setAirtableStylePreviews] = useState<Record<string, string[]>>({});
    const [hasLoadedAirtableStylePreviews, setHasLoadedAirtableStylePreviews] = useState(false);
    const [isLoadingAirtableStylePreviews, setIsLoadingAirtableStylePreviews] = useState(false);
    const [failedImages, setFailedImages] = useState<Record<string, true>>({});
    const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
    const [showInspirationWall, setShowInspirationWall] = useState(false);
    const [editorLaunchOverlay, setEditorLaunchOverlay] = useState<{
        title: string;
        detail: string;
    } | null>(null);
    const [billingGateOpen, setBillingGateOpen] = useState(false);

    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [uploadPartLabel, setUploadPartLabel] = useState<string | null>(null);
    const [uploadErrorDetail, setUploadErrorDetail] = useState<string | null>(null);

    const logAuthEvent = (event: string, detail?: any) => {
        console.error('[AUTH_AUDIT]', event, detail);
    };

    const logUploadEvent = (status: string, detail?: any) => {
        console.log('[UPLOAD_EVENT]', status, detail);
    };

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (uploadStatus === 'uploading' || uploadStatus === 'retrying') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [uploadStatus]);

    const [sourceUrl, setSourceUrl] = useState("");

    const activeStyle = React.useMemo(
        () => STYLE_TEMPLATES.find((s) => s.id === activeStyleId) ?? null,
        [activeStyleId]
    );
    const sourceUrlValue = sourceUrl.trim();
    const pendingSourceProfile = pendingUpload?.sourceProfile ?? null;
    const pendingSourceMetrics = pendingSourceProfile ? formatSourceProfileMetric(pendingSourceProfile) : null;
    const sourceReady = addSourceMode === "upload" ? !!pendingUpload : sourceUrlValue.length > 0;
    const sourceDisplayName = pendingUpload?.file.name
        ?? (sourceUrlValue.length > 0 ? sourceUrlValue.replace(/^https?:\/\//, "") : "Drop a clip to stage it here");
    const sourcePrimaryBadge = pendingUpload?.kind
        ? pendingUpload.kind.toUpperCase()
        : addSourceMode === "link"
            ? "URL"
            : "VIDEO";
    const sourceDetail = pendingUpload
        ? pendingUpload.inspectionState === "inspecting"
            ? "Inspecting file locally"
            : pendingUpload.inspectionState === "failed"
                ? pendingUpload.inspectionError ?? formatFileSize(pendingUpload.file.size)
                : pendingSourceProfile
                    ? `${pendingSourceMetrics?.resolution ?? formatFileSize(pendingUpload.file.size)} · ${formatTimeProfile(pendingSourceProfile.timeProfile)}`
                    : formatFileSize(pendingUpload.file.size)
        : sourceUrlValue.length > 0
            ? "Remote source detected"
            : "Waiting for a source";
    const sourceExtension = pendingUpload?.file.name.split(".").pop()?.toUpperCase()
        ?? (addSourceMode === "link" ? "URL" : "MP4");
    const uploadStudioTabs = [
        { label: "Source Map", icon: Upload },
        { label: "Prompt", icon: SendIcon },
    ];
    const uploadStudioVitals = [
        pendingSourceProfile
            ? { label: "Format", value: pendingSourceMetrics?.resolution ?? sourceExtension, meta: formatAspectFamily(pendingSourceProfile.aspectFamily) }
            : { label: "Format", value: sourceExtension, meta: sourcePrimaryBadge },
        pendingSourceProfile
            ? { label: "Runtime", value: pendingSourceMetrics?.duration ?? "Unknown duration", meta: formatDurationBucket(pendingSourceProfile.durationBucket) }
            : { label: "Mode", value: addSourceMode === "upload" ? "Upload" : "Link", meta: sourceReady ? "Source staged" : "Signal standby" },
        pendingSourceProfile
            ? { label: "Weight", value: formatWeightBucket(pendingSourceProfile.weightBucket), meta: formatProcessingClass(pendingSourceProfile.processingClass) }
            : { label: "State", value: sourceReady ? "Live" : "Idle", meta: "Source signal" },
        pendingSourceProfile
            ? { label: "Audio", value: pendingSourceMetrics?.audio ?? "Audio unknown", meta: formatSourceOrientation(pendingSourceProfile.inspection.orientation) }
            : { label: "Shell", value: "Phonk", meta: "Neo dashboard" },
    ];
    const uploadStudioStages = [
        { label: "Source", meta: sourceReady ? "Signal armed" : "Awaiting clip", icon: Upload },
        { label: "Engine", meta: "Central board", icon: MonitorIcon },
        { label: "Attach", meta: "Prompt ready", icon: ArrowUpIcon },
    ];
    const uploadStudioUtilities = [
        { label: "Clip Dock", icon: Paperclip },
        { label: "Frames", icon: Film },
        { label: "Prompt", icon: ArrowUpIcon },
    ];
    const useGlassUploadPopup = true;

    useEffect(() => {
        const id = getActiveStyleId();
        setActiveStyleId(id && id.length > 0 ? id : null);
    }, []);

    useEffect(() => {
        if (process.env.NODE_ENV !== "development") return;
        if (typeof window === "undefined") return;

        const w = window as unknown as { __airtableVerifyChecklistLogged?: boolean };
        if (w.__airtableVerifyChecklistLogged) return;
        w.__airtableVerifyChecklistLogged = true;

        console.log(
            [
                "[Airtable] Run and verify:",
                "1) Verify health: open /api/airtable/health",
                "2) Verify items: open /api/airtable/images?limit=5",
                "3) UI: open Templates and Styles modal, look for Airtable/Local badge",
            ].join("\n")
        );
    }, []);

    useEffect(() => {
        if (!templatesOpen || hasLoadedAirtableStylePreviews) return;

        const cached = readAirtableStylePreviewCache();
        if (cached) {
            setAirtableStylePreviews(cached);
            setHasLoadedAirtableStylePreviews(true);
            return;
        }

        let cancelled = false;
        setIsLoadingAirtableStylePreviews(true);

        void fetchAirtableStylePreviewArchive()
            .then((nextPreviews) => {
                if (cancelled) return;
                setAirtableStylePreviews(nextPreviews);
                setHasLoadedAirtableStylePreviews(true);
            })
            .finally(() => {
                if (cancelled) return;
                setIsLoadingAirtableStylePreviews(false);
            });

        return () => {
            cancelled = true;
        };
    }, [hasLoadedAirtableStylePreviews, templatesOpen]);

    useEffect(() => {
        return () => {
            if (pendingUpload?.previewUrl) {
                URL.revokeObjectURL(pendingUpload.previewUrl);
            }
        };
    }, [pendingUpload?.previewUrl]);

    useEffect(() => {
        return () => {
            if (submitCooldownTimerRef.current !== null) {
                window.clearTimeout(submitCooldownTimerRef.current);
                submitCooldownTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            if (launchNavigationTimerRef.current !== null) {
                window.clearTimeout(launchNavigationTimerRef.current);
                launchNavigationTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const cancelIdleWork = scheduleWhenBrowserIsIdle(() => {
            const warmProject = getMostRecentProject();
            if (warmProject) {
                void router.prefetch(`/editor/${warmProject.id}`);
                return;
            }

            void router.prefetch("/editor/__new__");
        }, 2600);

        return cancelIdleWork;
    }, [router]);

    const addSourceChip = (label: string) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        setAttachments((prev) => (prev.includes(trimmed) ? prev : [trimmed, ...prev]));
    };

    const handleComposerSubmit = useCallback(async (payload: PromptComposerSubmitPayload) => {
        if (submitLockRef.current) return false;
        
        if (!DISABLE_EDITOR_BILLING_GATE && !hasBillingAccess()) {
            setBillingGateOpen(true);
            return false;
        }

        const { message, activeSlashCommand, creatorMentions } = payload;
        const uploadedSourceLabel = uploadedFileName?.trim().length > 0
            ? uploadedFileName.replace(/\.[^/.]+$/, "")
            : "the attached source";
        const hasAttachedSource = attachments.length > 0 || uploadedFileName.trim().length > 0;
        const styleHint = creatorMentions.length
            ? ` Style reference creators: ${creatorMentions.map((creator) => creator.name).join(", ")}.`
            : "";
        const activeStyleSignal = activeStyle
            ? `Animation style: ${activeStyle.name} - ${activeStyle.description}`
            : null;
        const prompt = activeSlashCommand
            ? `${activeSlashCommand.raw}${message ? ` ${message}` : ""}`
            : message.trim().length > 0
                ? `${message}${styleHint}`
                : hasAttachedSource
                    ? `Start with ${uploadedSourceLabel}.${styleHint}`.trim()
                    : "";
        // REMOVED: if (!prompt && !hasAttachedSource) return false;

        submitLockRef.current = true;
        if (submitCooldownTimerRef.current !== null) {
            window.clearTimeout(submitCooldownTimerRef.current);
        }

        const nextProjectTitle =
            uploadedFileName?.trim().length > 0
                ? uploadedFileName.replace(/\.[^/.]+$/, "")
                : (message || activeSlashCommand?.label || prompt).slice(0, 28);
        const selectedSourceFile = queuedSourceUpload?.file ?? null;
        let resolvedPreviewKind = queuedSourceUpload?.previewKind ?? null;
        let resolvedSourceAssetId: string | null = null;
        let resolvedSourceProfile = queuedSourceUpload?.sourceProfile ?? null;
        const launchProjectTitle = nextProjectTitle || "PROMETHEUS Project";
        const launchDetail =
            selectedSourceFile || uploadedFileName.trim().length > 0
                ? "Finalizing your upload and opening the editor."
                : "Opening the editor workspace.";

        setEditorLaunchOverlay({
            title: launchProjectTitle,
            detail: launchDetail,
        });
        await waitForNextPaint();

        let currentStage = 'INIT';
        try {
            if (selectedSourceFile && !resolvedSourceProfile) {
                currentStage = 'SOURCE_INSPECT';
                resolvedSourceProfile = await inspectSourceFile(selectedSourceFile).catch(() => null);
            }

            currentStage = 'AUTH_CHECK';
            const supabase = createClient();
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                logAuthEvent('SESSION_ERROR', sessionError);
            }
            if (!session?.user) {
                logAuthEvent('UNAUTHORIZED');
                throw new Error("You must be logged in to create a project.");
            }
            logAuthEvent('AUTHORIZED', { userId: session.user.id });

            currentStage = 'WORKSPACE_FETCH';
            const { data: workspaces, error: workspaceError } = await supabase
                .from('workspaces')
                .select('id')
                .eq('owner_id', session.user.id)
                .limit(1);

            if (workspaceError) {
                console.error("[video-upload] Workspace fetch error:", workspaceError);
            }
            const workspaceId = workspaces?.[0]?.id;

            currentStage = 'PROJECT_CREATE';
            setUploadStatus('presigning');
            const projectRes = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: (nextProjectTitle || prompt).slice(0, 50),
                    title: nextProjectTitle || "PROMETHEUS Project",
                    prompt: prompt,
                    previewKind: resolvedPreviewKind ?? undefined,
                    sourceProfile: resolvedSourceProfile ?? undefined,
                    userId: session.user.id,
                    workspaceId: workspaceId,
                }),
            });

            const projectData = await projectRes.json();
            
            if (!projectRes.ok || projectData.error || !projectData.project) {
                console.error("[video-upload] Project creation failed:", projectData.error);
                throw new Error(projectData.error || "Failed to create project");
            }
            const project = projectData.project;

            // Phase 2B: Wire Upload UI to Cloudflare R2
            let cloudAssetId = null;
            if (selectedSourceFile) {
                setEditorLaunchOverlay({
                    title: launchProjectTitle,
                    detail: "Preparing secure upload channel...",
                });

                currentStage = 'R2_MULTIPART_UPLOAD';
                const abortController = new AbortController();
                abortControllerRef.current = abortController;
                setUploadProgress(0);
                setUploadErrorDetail(null);
                setUploadPartLabel(null);

                const multipartResult = await uploadProjectSourceMultipart({
                    assetId: resolvedSourceAssetId,
                    file: selectedSourceFile,
                    projectId: project.id,
                    signal: abortController.signal,
                    onProgress: (progress) => {
                        const nextStatus: UploadStatus =
                            progress.phase === 'initiating'
                                ? 'presigning'
                                : progress.phase === 'retrying'
                                    ? 'retrying'
                                    : progress.phase === 'aborting'
                                        ? 'paused'
                                        : progress.phase === 'done'
                                            ? 'done'
                                            : 'uploading';
                        const partLabel = progress.totalParts > 1
                            ? `Uploading part ${Math.max(1, progress.currentPart)} of ${progress.totalParts}`
                            : `Uploading ${formatFileSize(selectedSourceFile.size)}`;
                        const detail = describeMultipartUploadProgress(progress, selectedSourceFile.name);

                        logUploadEvent(progress.phase, {
                            bytesUploaded: progress.bytesUploaded,
                            currentPart: progress.currentPart,
                            percentage: progress.percentage,
                            totalParts: progress.totalParts,
                        });
                        setUploadStatus(nextStatus);
                        setUploadProgress(progress.percentage);
                        setUploadPartLabel(partLabel);
                        setEditorLaunchOverlay({
                            title: launchProjectTitle,
                            detail,
                        });
                    },
                });

                const uploadAsset = multipartResult.asset;
                cloudAssetId = uploadAsset.id;
                abortControllerRef.current = null;

                setEditorLaunchOverlay({
                    title: launchProjectTitle,
                    detail: "Registering asset metadata...",
                });

                // 3. Register the uploaded asset metadata
                currentStage = 'ASSET_REGISTER';
                const assetRegisterRes = await fetch(`/api/projects/${project.id}/assets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assetId: uploadAsset.id,
                        bucket: uploadAsset.bucket,
                        objectKey: uploadAsset.objectKey,
                        filename: selectedSourceFile.name,
                        mimeType: selectedSourceFile.type,
                        sizeBytes: selectedSourceFile.size,
                        durationMs: resolvedSourceProfile?.inspection.durationSec ? Math.round(resolvedSourceProfile.inspection.durationSec * 1000) : undefined,
                        width: resolvedSourceProfile?.inspection.width,
                        height: resolvedSourceProfile?.inspection.height,
                        profile: resolvedSourceProfile,
                    }),
                });

                if (!assetRegisterRes.ok) {
                    const errorData = await assetRegisterRes.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${assetRegisterRes.status} from asset registration`);
                }

                // Update local project object with the newly registered asset ID
                project.sourceAssetId = uploadAsset.id;
            }

            // Sync the REAL project from the API back to MOCK storage so the editor can see it
            currentStage = 'SYNC_MOCK';
            upsertProject(project);

            if (selectedSourceFile && (resolvedPreviewKind === "video" || resolvedPreviewKind === "image")) {
                setSessionSourcePreview({
                    projectId: project.id,
                    file: selectedSourceFile,
                    previewKind: resolvedPreviewKind,
                    sourceAssetId: cloudAssetId || resolvedSourceAssetId,
                });
            }

            currentStage = 'CREATE_JOB';
            const nextJob = createProcessingJob({
                projectId: project.id,
                input: {
                    prompt,
                    sources: [
                        ...attachments,
                        ...creatorMentions.map((creator) => `Creator: ${creator.name}`),
                        ...(activeStyleSignal ? [activeStyleSignal] : []),
                    ],
                    styleId: activeStyleId ?? undefined,
                },
            });
            persistStartProcessing(nextJob);
            const editorRoute = `/editor/${project.id}`;
            rememberCurrentPathForEditorReturn();
            markPendingEditorNavigation(editorRoute);
            if (launchNavigationTimerRef.current !== null) {
                window.clearTimeout(launchNavigationTimerRef.current);
                launchNavigationTimerRef.current = null;
            }
            void router.prefetch(editorRoute);
            if (SHOULD_USE_EDITOR_NAVIGATION_FALLBACK) {
                launchNavigationTimerRef.current = window.setTimeout(() => {
                    const pendingEditorRoute = getPendingEditorNavigation();
                    if (pendingEditorRoute !== editorRoute) {
                        return;
                    }

                    if (window.location.pathname !== editorRoute) {
                        window.location.assign(editorRoute);
                    }
                }, EDITOR_NAVIGATION_FALLBACK_DELAY_MS);
            }
            currentStage = 'EDITOR_NAVIGATION';
            React.startTransition(() => {
                router.push(editorRoute);
            });
            setUploadStatus('done');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.info('[UploadCancelled] R2 multipart upload aborted by user.');
                logUploadEvent('cancelled', { stage: currentStage });
                setUploadStatus('paused');
                setUploadPartLabel('Upload cancelled');
                setUploadErrorDetail(null);
                setEditorLaunchOverlay(null);
                submitLockRef.current = false;
                clearPendingEditorNavigation();
                if (submitCooldownTimerRef.current !== null) {
                    window.clearTimeout(submitCooldownTimerRef.current);
                    submitCooldownTimerRef.current = null;
                }
                if (launchNavigationTimerRef.current !== null) {
                    window.clearTimeout(launchNavigationTimerRef.current);
                    launchNavigationTimerRef.current = null;
                }
                return false;
            }

            const userMessage = normalizeUxError(error, "upload");
            console.error(`[UploadFailure] Stage: ${currentStage}, Error:`, error);
            logUploadEvent('error', { stage: currentStage, error: errorMessage });
            setUploadStatus('error');
            setUploadErrorDetail(errorMessage);
            setUploadPartLabel(null);
            toast.error('Upload handoff paused', {
                description: userMessage,
            });

            setEditorLaunchOverlay(null);
            submitLockRef.current = false;
            clearPendingEditorNavigation();
            if (submitCooldownTimerRef.current !== null) {
                window.clearTimeout(submitCooldownTimerRef.current);
                submitCooldownTimerRef.current = null;
            }
            if (launchNavigationTimerRef.current !== null) {
                window.clearTimeout(launchNavigationTimerRef.current);
                launchNavigationTimerRef.current = null;
            }
            return false;
        }

        submitCooldownTimerRef.current = window.setTimeout(() => {
            submitLockRef.current = false;
            submitCooldownTimerRef.current = null;
        }, 600);

        return true;
    }, [
        activeStyle,
        activeStyleId,
        attachments,
        router,
        uploadedFileName,
        queuedSourceUpload,
    ]);

    const openUploadComposer = useCallback(() => {
        setAddSourceMode("upload");
        setShowFileUploadModal(true);
    }, []);

    const clearActiveStyle = useCallback(() => {
        setActiveStyleId(null);
        persistActiveStyleId(null);
    }, []);

    const clearPendingUpload = () => {
        uploadInspectionRunRef.current += 1;
        setPendingUpload((prev) => {
            if (prev?.previewUrl) {
                URL.revokeObjectURL(prev.previewUrl);
            }
            return null;
        });
    };

    const closeSourceModal = () => {
        setShowFileUploadModal(false);
        clearPendingUpload();
        setAddSourceMode("link");
        setSourceUrl("");
        setIsSourceDragOver(false);
    };

    const cancelActiveUpload = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setUploadStatus('paused');
        setUploadPartLabel('Upload cancelled');
        setEditorLaunchOverlay(null);
        submitLockRef.current = false;
        clearPendingEditorNavigation();
        if (launchNavigationTimerRef.current !== null) {
            window.clearTimeout(launchNavigationTimerRef.current);
            launchNavigationTimerRef.current = null;
        }
        toast.message('Upload cancelled', {
            description: 'Prometheus aborted the multipart upload and cleaned up incomplete R2 parts.',
        });
    }, []);

    const handleUploadSelection = async (files: File[]) => {
        if (files.length === 0) return;
        const file = files[0]!;
        const validationError = validateStudioUpload(file);
        if (validationError) {
            toast.error("Source rejected", { description: validationError });
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        const kind = detectUploadKind(file);
        const inspectionRunId = uploadInspectionRunRef.current + 1;
        uploadInspectionRunRef.current = inspectionRunId;

        setPendingUpload((prev) => {
            if (prev?.previewUrl) {
                URL.revokeObjectURL(prev.previewUrl);
            }
            return {
                file,
                previewUrl,
                kind,
                sourceProfile: null,
                inspectionState: kind === "video" || kind === "image" || kind === "audio" ? "inspecting" : "ready",
                inspectionError: null,
            };
        });

        if (kind !== "video" && kind !== "image" && kind !== "audio") {
            return;
        }

        try {
            const sourceProfile = await inspectSourceFile(file);

            if (uploadInspectionRunRef.current !== inspectionRunId) return;

            setPendingUpload((prev) => {
                if (!prev || prev.file !== file) return prev;
                return {
                    ...prev,
                    sourceProfile,
                    inspectionState: "ready",
                    inspectionError: null,
                };
            });
        } catch (error) {
            if (uploadInspectionRunRef.current !== inspectionRunId) return;

            setPendingUpload((prev) => {
                if (!prev || prev.file !== file) return prev;
                return {
                    ...prev,
                    inspectionState: "failed",
                    inspectionError: error instanceof Error ? error.message : "Unable to inspect this file locally",
                };
            });
        }
    };

    const applyUploadToPrompt = () => {
        if (!pendingUpload) return;
        setUploadedFileName(pendingUpload.file.name);
        setQueuedSourceUpload({
            file: pendingUpload.file,
            previewKind: pendingUpload.kind === "video" || pendingUpload.kind === "image" ? pendingUpload.kind : null,
            sourceProfile: pendingUpload.sourceProfile ?? null,
        });
        addSourceChip(`Upload: ${pendingUpload.file.name}`);
        closeSourceModal();

        // Directly transition to editor after applying upload
        void handleComposerSubmit({
            message: "",
            activeSlashCommand: null,
            creatorMentions: [],
        });
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => {
            const target = prev[index] ?? "";
            if (target.startsWith("Upload: ")) {
                setUploadedFileName("");
                setQueuedSourceUpload(null);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const importSourceLink = () => {
        const raw = sourceUrl.trim();
        if (!raw) return;

        const normalized = raw.startsWith("http://") || raw.startsWith("https://")
            ? raw
            : `https://${raw}`;

        try {
            const parsed = new URL(normalized);
            addSourceChip(`Link: ${parsed.hostname.replace(/^www\./, "")}`);
        } catch {
            addSourceChip("Link imported");
        }

        closeSourceModal();
    };

    const handleSourceFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        handleUploadSelection(files);
        event.target.value = "";
    };

    const handleSourceDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsSourceDragOver(false);
        const files = Array.from(event.dataTransfer.files ?? []);
        handleUploadSelection(files);
    };

    const isUploading = uploadStatus === 'uploading' || uploadStatus === 'retrying';

    return (
        <div className={cn(
            "relative min-h-full w-full overflow-hidden bg-[#050505] px-4 py-10 text-white sm:px-6 sm:py-12",
            isUploading && "pointer-events-none opacity-80"
        )}>
            <BillingRequiredDialog open={billingGateOpen} redirectHref={buildBillingHref('/')} contextLabel="Editing access" />
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 left-[14%] h-80 w-80 rounded-full bg-[#2c7df7]/[0.1] blur-[130px]" />
                <div className="absolute top-[18%] right-[10%] h-72 w-72 rounded-full bg-[#68f0d7]/[0.08] blur-[120px]" />
                <div className="absolute bottom-[-140px] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#f4df9a]/[0.07] blur-[150px]" />
                <div className="absolute inset-x-0 top-[38%] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            </div>
            <div className="relative mx-auto w-full max-w-5xl">
                <motion.div
                    className="relative z-10 space-y-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <motion.div
                        className="flex flex-col items-center gap-4 pt-2 text-center"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12, duration: 0.45 }}
                    >
                        <InteractiveOrb size={76} intensity="vivid" />
                        <motion.h1
                            aria-label="Ready to Create Something New?"
                            className="flex flex-wrap items-baseline justify-center gap-x-2 text-[35px] font-extrabold leading-[0.94] tracking-normal text-white sm:text-[48px] md:text-[59px]"
                            style={STUDIO_DISPLAY_FONT_STYLE}
                            initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ delay: 0.08, duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <span>Ready to Create Something</span>
                            <GooeyText
                                texts={["New", "Next", "Live"]}
                                morphTime={0.95}
                                cooldownTime={0.65}
                                className="h-[0.95em] w-[3.35ch] translate-y-[0.04em]"
                                textClassName="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[1em] font-extrabold leading-none text-white"
                            />
                            <span>?</span>
                        </motion.h1>
                        <TextEffect
                            as="p"
                            per="word"
                            preset="fade"
                            delay={0.28}
                            className="max-w-xl text-[15px] leading-7 text-white/58"
                        >
                            Upload a source, choose a visual lane, and send the next edit into motion.
                        </TextEffect>
                    </motion.div>

                    <PromptComposer
                        activeStyleId={activeStyleId}
                        activeStyleName={activeStyle?.name ?? null}
                        attachments={attachments}
                        templatesOpen={templatesOpen}
                        onClearStyle={clearActiveStyle}
                        onOpenTemplates={() => setTemplatesOpen(true)}
                        onOpenUpload={openUploadComposer}
                        onRemoveAttachment={removeAttachment}
                        onSelectStyle={(styleId) => {
                            setActiveStyleId(styleId);
                            persistActiveStyleId(styleId);
                        }}
                        onSubmit={handleComposerSubmit}
                        uploadStatus={uploadStatus}
                        uploadProgress={uploadProgress}
                        footerAction={
                            <motion.button
                                type="button"
                                onClick={() => setShowInspirationWall((prev) => !prev)}
                                className={studioActionButtonClassName(showInspirationWall)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: COMMAND_SUGGESTIONS.length * 0.1 }}
                            >
                                <PanelsTopLeft className="h-3.5 w-3.5" />
                                <span>{showInspirationWall ? "Hide Showcase" : "Reveal Showcase"}</span>
                            </motion.button>
                        }
                    />

                    <StudioCinematicMarqueeRails
                        activeStyleId={activeStyleId}
                        onSelectStyle={(styleId) => {
                            setActiveStyleId(styleId);
                            persistActiveStyleId(styleId);
                        }}
                    />

                    <div className="space-y-4">
                        <AnimatePresence>
                            {showInspirationWall && (
                                <motion.div
                                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 16, scale: 0.98 }}
                                    transition={{ duration: 0.26, ease: "easeOut" }}
                                    className="overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(165deg,rgba(16,11,25,0.86)_0%,rgba(8,7,13,0.93)_100%)] shadow-[0_35px_90px_-45px_rgba(185,134,255,0.48)] backdrop-blur-xl"
                                >
                                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                                        <div>
                                            <div className="text-sm font-medium text-white/92">Dynamic Inspiration Wall</div>
                                            <div className="text-xs text-white/55">
                                                Hover tiles to expand and inspect motion styling.
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowInspirationWall(false)}
                                            className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/65 transition-colors hover:text-white"
                                        >
                                            Close
                                        </button>
                                    </div>
                                    <div className="h-[360px] p-2 sm:h-[430px] md:h-[500px]">
                                        <DynamicFrameLayout
                                            frames={DEMO_FRAMES}
                                            className="h-full w-full"
                                            hoverSize={6}
                                            gapSize={4}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            {/* ADD SOURCE MODAL */}
            <Dialog
                open={showFileUploadModal}
                onOpenChange={(open) => {
                    setShowFileUploadModal(open);
                    if (!open) closeSourceModal();
                }}
            >
                <DialogContent className="w-[calc(100vw-1rem)] max-w-[1040px] max-h-[calc(100svh-1rem)] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:w-[calc(100vw-2rem)] sm:max-h-[calc(100svh-2rem)] [&>button[aria-label='Close']]:hidden">
                    <DialogClose asChild>
                        <button
                            type="button"
                            className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-lg border border-white/12 bg-black/55 text-white/70 shadow-[0_18px_42px_-26px_rgba(0,0,0,0.92)] backdrop-blur-xl transition-colors hover:bg-black/72 hover:text-white sm:right-5 sm:top-5"
                            aria-label="Close source popup"
                        >
                            <XIcon className="h-5 w-5" />
                        </button>
                    </DialogClose>

                    {useGlassUploadPopup ? (
                        <GlassUploadModalView
                            addSourceMode={addSourceMode}
                            isSourceDragOver={isSourceDragOver}
                            onApplyUploadToPrompt={applyUploadToPrompt}
                            onClearPendingUpload={clearPendingUpload}
                            onImportSourceLink={importSourceLink}
                            onModeChange={setAddSourceMode}
                            onSourceDragLeave={() => setIsSourceDragOver(false)}
                            onSourceDragOver={(event) => {
                                event.preventDefault();
                                setIsSourceDragOver(true);
                            }}
                            onSourceDrop={handleSourceDrop}
                            onSourceFileInputChange={handleSourceFileInputChange}
                            onSourceUrlChange={setSourceUrl}
                            pendingUpload={pendingUpload}
                            sourceDetail={sourceDetail}
                            sourceDisplayName={sourceDisplayName}
                            sourceExtension={sourceExtension}
                            sourceFileInputRef={sourceFileInputRef}
                            sourcePrimaryBadge={sourcePrimaryBadge}
                            sourceReady={sourceReady}
                            sourceUrl={sourceUrl}
                            sourceUrlValue={sourceUrlValue}
                        />
                    ) : (
                    <div className="relative flex max-h-[calc(100svh-1rem)] flex-col overflow-hidden rounded-[40px] border border-[#6d685f] bg-[linear-gradient(180deg,#67625b_0%,#5b5650_100%)] p-2 shadow-[0_56px_140px_-54px_rgba(0,0,0,0.98)] sm:max-h-[calc(100svh-2rem)] sm:rounded-[54px] sm:p-3">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_34%)]"
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-x-20 top-0 h-24 bg-[radial-gradient(circle_at_center,rgba(242,255,74,0.18)_0%,rgba(242,255,74,0)_72%)]"
                        />

                        <DialogHeader className="relative shrink-0 p-0">
                            <motion.div
                                initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                                className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,#635f58_0%,#5a554f_100%)] px-4 pb-5 pt-4 sm:rounded-[36px] sm:px-6 sm:pb-6 sm:pt-5"
                            >
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/10"
                                />
                                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                                    <div className="max-w-xl">
                                        <DialogTitle className="text-[30px] font-medium tracking-tight text-[#f5f2ea] sm:text-[38px]">
                                        Upload Studio
                                    </DialogTitle>
                                        <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-[#d9d4cb]">
                                            Stage the source inside a structured board before it is attached to the prompt.
                                    </DialogDescription>
                                    </div>

                                    <div className="flex flex-wrap gap-2 xl:justify-end">
                                        {uploadStudioTabs.map(({ label, icon: Icon }) => (
                                            <span
                                                key={label}
                                                className="inline-flex items-center gap-2 rounded-full border border-[#d0cbc0] bg-[#f7f4ec] px-4 py-2 text-[11px] font-medium text-[#2f302b] shadow-[inset_0_1px_0_rgba(255,255,255,0.96)]"
                                            >
                                                <Icon className="h-3.5 w-3.5 text-[#666158]" />
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </DialogHeader>

                        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#d8d5cd_0%,#cfcbc2_100%)] px-3 py-3 sm:px-5 sm:py-5">
                            <motion.div
                                initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                className="relative min-h-[820px] rounded-[34px] border border-[#bdb8ae] bg-[linear-gradient(180deg,#e6e3db_0%,#ddd9d0_100%)] px-4 pb-24 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] sm:rounded-[40px] sm:px-6 sm:pb-28 sm:pt-6"
                            >
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0)_72%)]"
                                />

                                <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                                    <motion.div
                                        initial={{ opacity: 0, x: -18 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.44, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                                        className="rounded-[32px] border border-[#d1cdc4] bg-[#f4f2eb] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_20px_34px_-26px_rgba(32,28,25,0.42)]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[24px] border border-[#d4d0c8] bg-[#d9d5cd]">
                                                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(36,33,43,0.18)_0%,rgba(36,33,43,0)_70%)] text-[#2b2831]">
                                                    {pendingUpload?.kind === "audio" ? (
                                                        <Music2 className="h-7 w-7" />
                                                    ) : pendingUpload?.kind === "file" ? (
                                                        <FileText className="h-7 w-7" />
                                                    ) : pendingUpload?.kind === "image" ? (
                                                        <ImageIcon className="h-7 w-7" />
                                                    ) : (
                                                        <Video className="h-7 w-7" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="min-w-0 space-y-1">
                                                <div className="text-[11px] uppercase tracking-[0.18em] text-[#79736a]">
                                                    Active Source
                                                </div>
                                                <div className="truncate text-[24px] font-medium leading-none text-[#1e1c22]">
                                                    {sourceDisplayName}
                                                </div>
                                                <div className="text-sm text-[#706b63]">{sourceDetail}</div>
                                                <div className="pt-1 text-xs text-[#8b857d]">
                                                    Live shell feed staged for the central board.
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <div className="space-y-5">
                                        <motion.div
                                            initial={{ opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.44, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                                            className="flex flex-wrap items-start justify-between gap-4"
                                        >
                                            <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                                {uploadStudioVitals.map((stat) => (
                                                    <div key={stat.label} className="min-w-0">
                                                        <div className="text-[10px] uppercase tracking-[0.18em] text-[#7e776f]">
                                                            {stat.label}
                                                        </div>
                                                        <div className="mt-1 truncate text-[30px] leading-none text-[#1f1c24]">
                                                            {stat.value}
                                                        </div>
                                                        <div className="mt-1 text-xs text-[#6f6a62]">{stat.meta}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                                {uploadStudioTabs.map(({ label, icon: Icon }) => (
                                                    <span
                                                        key={label}
                                                        className="inline-flex items-center gap-2 rounded-full border border-[#d0cbc0] bg-[#f7f4ec] px-4 py-2 text-[11px] font-medium text-[#2f302b] shadow-[inset_0_1px_0_rgba(255,255,255,0.96)]"
                                                    >
                                                        <Icon className="h-3.5 w-3.5 text-[#666158]" />
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.44, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                            className="flex flex-wrap items-center gap-3"
                                        >
                                            <div className="inline-flex rounded-full border border-[#c7c3bb] bg-[#f4f2eb] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
                                                <button
                                                    type="button"
                                                    onClick={() => setAddSourceMode("upload")}
                                                    className={cn(
                                                        "inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-300",
                                                        addSourceMode === "upload"
                                                            ? "bg-[#26232c] text-[#f2f1ec] shadow-[0_12px_26px_-20px_rgba(0,0,0,0.95)]"
                                                            : "text-[#4c4850] hover:text-[#232029]"
                                                    )}
                                                >
                                                    <Upload className="h-4 w-4" />
                                                    Upload
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAddSourceMode("link")}
                                                    className={cn(
                                                        "inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-300",
                                                        addSourceMode === "link"
                                                            ? "bg-[#26232c] text-[#f2f1ec] shadow-[0_12px_26px_-20px_rgba(0,0,0,0.95)]"
                                                            : "text-[#4c4850] hover:text-[#232029]"
                                                    )}
                                                >
                                                    <LinkIcon className="h-4 w-4" />
                                                    Link
                                                </button>
                                            </div>

                                            <span className="rounded-full border border-[#d9db59] bg-[#ecff49] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d1d1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                                                {sourceReady ? "Source Staged" : "Awaiting Clip"}
                                            </span>
                                            <span className="rounded-full border border-[#cbc7be] bg-white/60 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#58534c]">
                                                Neo dashboard shell
                                            </span>
                                        </motion.div>
                                    </div>
                                </div>

                                <div className="relative mt-8 min-h-[560px] overflow-hidden rounded-[38px] border border-[#c5c1b8] bg-[linear-gradient(180deg,#e9e6df_0%,#dfdbd2_100%)] px-3 pb-24 pt-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_30px_60px_-42px_rgba(33,30,27,0.55)] sm:px-5 sm:pb-28 sm:pt-12">
                                    <svg
                                        aria-hidden
                                        viewBox="0 0 1120 620"
                                        preserveAspectRatio="none"
                                        className="pointer-events-none absolute inset-0 h-full w-full"
                                    >
                                        <defs>
                                            <linearGradient id="studioRail" x1="0%" x2="100%" y1="0%" y2="0%">
                                                <stop offset="0%" stopColor="#ea9087" stopOpacity="0.95" />
                                                <stop offset="50%" stopColor="#d8cf6e" stopOpacity="0.7" />
                                                <stop offset="100%" stopColor="#90b78c" stopOpacity="0.95" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M0 178 H1120" stroke="url(#studioRail)" strokeWidth="2.2" />
                                        <path d="M110 178 V575" stroke="#c2beb5" strokeWidth="1.3" />
                                        <path d="M610 178 V575" stroke="#c2beb5" strokeWidth="1.3" />
                                        <path d="M257 238 C257 238 294 238 302 278 V448 C302 490 342 490 360 490" stroke="#6e6864" strokeWidth="1.6" fill="none" />
                                        <path d="M718 238 C718 238 756 238 764 278 V448 C764 490 722 490 706 490" stroke="#6e6864" strokeWidth="1.6" fill="none" />
                                        <path d="M430 322 C374 322 356 300 356 276" stroke="#8a847e" strokeWidth="1.4" fill="none" />
                                        <path d="M690 322 C746 322 764 300 764 276" stroke="#8a847e" strokeWidth="1.4" fill="none" />
                                        <path d="M0 580 H1120" stroke="#d2cec5" strokeWidth="1.2" />
                                    </svg>

                                    <div className="absolute inset-x-[9%] top-[110px] hidden items-start justify-between lg:flex">
                                        {uploadStudioStages.slice(0, 2).map(({ label, icon: Icon }, index) => (
                                            <div key={label} className={cn("relative flex flex-col items-center", index === 1 && "translate-x-10")}>
                                                <div className="grid h-12 w-12 place-items-center rounded-full border border-[#cfd35e] bg-[#ecff49] text-[#1d1d1d] shadow-[0_10px_24px_-16px_rgba(0,0,0,0.78)]">
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="mt-4 text-center">
                                                    <div className="text-[30px] leading-none text-[#25222a]">
                                                        {index === 0 ? "Aug" : "Sep"}
                                                    </div>
                                                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#767068]">
                                                        {label}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="translate-x-4 text-right">
                                            <div className="mb-4 text-xs uppercase tracking-[0.18em] text-[#767068]">
                                                {uploadStudioStages[2]?.label}
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={addSourceMode === "link" ? importSourceLink : applyUploadToPrompt}
                                                disabled={!sourceReady}
                                                className="h-14 w-14 rounded-full border border-[#3d3942] bg-[#2a2730] p-0 text-white hover:bg-[#34313b] disabled:border-[#76716b] disabled:bg-[#a7a29a]"
                                            >
                                                <PlusIcon className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {addSourceMode === "link" ? (
                                            <motion.div
                                                key="link-source"
                                                initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                                exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
                                                transition={{ duration: 0.24, ease: "easeOut" }}
                                                className="relative z-10 grid gap-5 pt-24 lg:grid-cols-[220px_minmax(0,1fr)_220px]"
                                            >
                                                <motion.aside
                                                    initial={{ opacity: 0, x: -18 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.36, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                                                    className="rounded-[30px] border border-[#d1cdc4] bg-[#faf8f2] p-4 shadow-[0_28px_50px_-38px_rgba(0,0,0,0.55)] lg:mt-10"
                                                >
                                                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#79736a]">
                                                        Source Dock
                                                    </div>
                                                    <div className="mt-3 rounded-[24px] border border-dashed border-[#b9b4ab] bg-[#f5f2ea] p-4">
                                                        <div className="rounded-full border border-[#d5d0c6] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#6f6961]">
                                                            URL Source
                                                        </div>
                                                        <Input
                                                            value={sourceUrl}
                                                            onChange={(e) => setSourceUrl(e.target.value)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter" && sourceUrlValue) {
                                                                    event.preventDefault();
                                                                    importSourceLink();
                                                                }
                                                            }}
                                                            placeholder="Paste a source link"
                                                            className="mt-4 h-12 rounded-[20px] border-[#c7c2b8] bg-white text-[#25222a] placeholder:text-[#7a756d]"
                                                        />
                                                        <p className="mt-3 text-sm leading-6 text-[#6d675f]">
                                                            Drop in a live reference URL and attach it from the right-side command node.
                                                        </p>

                                                    </div>
                                                </motion.aside>

                                                <motion.article
                                                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    transition={{ duration: 0.42, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                                                    className="rounded-[34px] border border-[#d1cdc4] bg-[#fbfaf6] p-4 shadow-[0_36px_80px_-52px_rgba(0,0,0,0.7)] lg:mt-4"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="rounded-full border border-[#d1cdc4] bg-white px-3 py-1.5 text-[11px] font-medium text-[#2a2630]">
                                                                URL
                                                            </span>
                                                            <span className="rounded-full border border-[#d1cdc4] bg-white px-3 py-1.5 text-[11px] font-medium text-[#2a2630]">
                                                                Source
                                                            </span>
                                                        </div>
                                                        <span className="rounded-full border border-[#d5d95a] bg-[#ecff49] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#202020]">
                                                            {sourceReady ? "Link armed" : "Standby"}
                                                        </span>
                                                    </div>

                                                    <div className="mt-4 overflow-hidden rounded-[30px] border border-[#3f3a42]/14 bg-[radial-gradient(circle_at_top,rgba(236,255,73,0.14)_0%,rgba(236,255,73,0)_34%),linear-gradient(180deg,#26222c_0%,#191720_100%)]">
                                                        <div className="flex min-h-[360px] flex-col items-center justify-center px-8 py-12 text-center text-[#f5f2eb] sm:min-h-[430px]">
                                                            <div className="rounded-full border border-white/14 bg-white/[0.06] p-4 shadow-[0_0_0_16px_rgba(236,255,73,0.08)]">
                                                                <LinkIcon className="h-8 w-8" />
                                                            </div>
                                                            <div className="mt-6 text-[28px] leading-tight">
                                                                Remote source will resolve into this central board
                                                            </div>
                                                            <div className="mt-3 max-w-md text-sm leading-6 text-white/62">
                                                                The lane stays device-like and cinematic while the link payload is staged.
                                                            </div>
                                                            {sourceUrlValue && (
                                                                <div className="mt-6 max-w-lg rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/74">
                                                                    {sourceUrlValue}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.article>

                                                <motion.aside
                                                    initial={{ opacity: 0, x: 18 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.36, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                                                    className="grid gap-4 lg:mt-16"
                                                >
                                                    <div className="rounded-[28px] border border-[#d1cdc4] bg-[#fbfaf6] p-4 shadow-[0_26px_48px_-40px_rgba(0,0,0,0.55)]">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="text-sm font-semibold text-[#2d2932]">Source Status</div>
                                                            <span className="rounded-full border border-[#d5d95a] bg-[#ecff49] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1f1f1f]">
                                                                {sourceReady ? "Ready" : "Idle"}
                                                            </span>
                                                        </div>
                                                        <div className="mt-4 space-y-2 text-sm text-[#4e4a53]">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span>Surface</span>
                                                                <span className="font-medium text-[#25212a]">Central board</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span>Feed</span>
                                                                <span className="truncate font-medium text-[#25212a]">Remote URL</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span>Shell</span>
                                                                <span className="font-medium text-[#25212a]">Phonk frame</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-[28px] border border-[#d1cdc4] bg-[#f4f2eb] p-4 shadow-[0_26px_48px_-40px_rgba(0,0,0,0.45)]">
                                                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#77726a]">
                                                            Attach Lane
                                                        </div>
                                                        <div className="mt-3 text-sm leading-6 text-[#5a554e]">
                                                            Use the dark plus command on the rail to attach this link directly into the prompt.
                                                        </div>
                                                    </div>
                                                </motion.aside>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="upload-source"
                                                initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                                exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
                                                transition={{ duration: 0.24, ease: "easeOut" }}
                                                className="relative z-10 grid gap-5 pt-24 lg:grid-cols-[220px_minmax(0,1fr)_220px]"
                                            >
                                                <motion.aside
                                                    initial={{ opacity: 0, x: -18 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.36, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                                                    className="space-y-4 lg:mt-10"
                                                >
                                                    <div className="rounded-[30px] border border-[#d1cdc4] bg-[#faf8f2] p-4 shadow-[0_28px_50px_-38px_rgba(0,0,0,0.55)]">
                                                        <input
                                                            ref={sourceFileInputRef}
                                                            type="file"
                                                            accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv"
                                                            className="hidden"
                                                            onChange={handleSourceFileInputChange}
                                                        />

                                                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#79736a]">
                                                            Source Dock
                                                        </div>
                                                        <div
                                                            onDragOver={(event) => {
                                                                event.preventDefault();
                                                                setIsSourceDragOver(true);
                                                            }}
                                                            onDragLeave={() => setIsSourceDragOver(false)}
                                                            onDrop={handleSourceDrop}
                                                            className={cn(
                                                                "mt-3 flex min-h-[220px] flex-col items-center justify-center rounded-[26px] border border-dashed px-4 py-8 text-center transition-all duration-300",
                                                                isSourceDragOver
                                                                    ? "border-[#35313b]/60 bg-[#f2efe7]"
                                                                    : "border-[#b7b2aa] bg-[#f7f4ed]"
                                                            )}
                                                        >
                                                            <div className="mb-3 rounded-full border border-[#d2cdc4] bg-white p-3 text-[#26232c] shadow-[0_14px_28px_-22px_rgba(0,0,0,0.42)]">
                                                                <Upload className="h-4 w-4" />
                                                            </div>
                                                            <p className="text-base font-medium text-[#2f2b34]">Drop video</p>
                                                            <p className="mt-1 text-xs text-[#6f6a62]">MP4, MOV, M4V, WEBM, MKV supported</p>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="mt-5 rounded-full border-[#8f8b95] bg-[#24212b] text-[#f2f1eb] hover:bg-[#35313c] hover:text-[#f2f1eb]"
                                                                onClick={() => sourceFileInputRef.current?.click()}
                                                            >
                                                                Choose File
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {pendingUpload && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.24, ease: "easeOut" }}
                                                            className="rounded-[26px] border border-[#d1cdc4] bg-[#fbfaf6] p-4 shadow-[0_24px_44px_-38px_rgba(0,0,0,0.48)]"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border border-[#d0cbc1] bg-[#1f1c25]">
                                                                <div className="flex h-full w-full items-center justify-center text-[#f4f3ee]">
                                                                    {pendingUpload.kind === "audio" ? (
                                                                        <Music2 className="h-4 w-4" />
                                                                    ) : pendingUpload.kind === "image" ? (
                                                                        <ImageIcon className="h-4 w-4" />
                                                                    ) : (
                                                                        <FileText className="h-4 w-4" />
                                                                    )}
                                                                </div>
                                                                </div>

                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-semibold text-[#2d2a33]">
                                                                        {pendingUpload.file.name}
                                                                    </p>
                                                                    <p className="text-xs text-[#69666e]">
                                                                        {formatFileSize(pendingUpload.file.size)}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="mt-4 rounded-full border-[#b0aba2] bg-transparent text-[#3c3941] hover:bg-[#eceae5]"
                                                                onClick={clearPendingUpload}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </motion.div>
                                                    )}
                                                </motion.aside>

                                                <motion.article
                                                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    transition={{ duration: 0.42, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                                                    className="rounded-[34px] border border-[#d1cdc4] bg-[#fbfaf6] p-4 shadow-[0_36px_80px_-52px_rgba(0,0,0,0.7)] lg:mt-4"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="rounded-full border border-[#d1cdc4] bg-white px-3 py-1.5 text-[11px] font-medium text-[#2a2630]">
                                                                {sourcePrimaryBadge}
                                                            </span>
                                                            <span className="rounded-full border border-[#d1cdc4] bg-white px-3 py-1.5 text-[11px] font-medium text-[#2a2630]">
                                                                Showcase
                                                            </span>
                                                        </div>
                                                        <span className="rounded-full border border-[#d5d95a] bg-[#ecff49] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#202020]">
                                                            {sourceReady ? "Showcase live" : "Awaiting source"}
                                                        </span>
                                                    </div>
                                                    <div className="mt-4 overflow-hidden rounded-[30px] border border-[#3f3a42]/14 bg-[radial-gradient(circle_at_top,rgba(236,255,73,0.14)_0%,rgba(236,255,73,0)_30%),linear-gradient(180deg,#26222c_0%,#191720_100%)]">
                                                        <div className="flex min-h-[360px] flex-col items-center justify-center px-8 py-12 text-center text-[#f4f2eb] sm:min-h-[430px]">
                                                            <div className="rounded-full border border-white/15 bg-white/[0.06] p-4 shadow-[0_0_0_16px_rgba(233,255,73,0.08)]">
                                                                {pendingUpload?.kind === "video" ? (
                                                                    <Video className="h-8 w-8" />
                                                                ) : pendingUpload?.kind === "image" ? (
                                                                    <ImageIcon className="h-8 w-8" />
                                                                ) : pendingUpload?.kind === "audio" ? (
                                                                    <Music2 className="h-8 w-8" />
                                                                ) : (
                                                                    <FileText className="h-8 w-8" />
                                                                )}
                                                            </div>
                                                            <div className="mt-5 text-[28px] leading-tight">
                                                                {pendingUpload ? "Source staged for editing" : "Your uploaded clip will resolve here"}
                                                            </div>
                                                            <div className="mt-2 max-w-md text-sm leading-6 text-white/60">
                                                                The layout now follows the reference: a single instrument panel with the source dock, rail, and bottom control strip.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.article>

                                                <motion.aside
                                                    initial={{ opacity: 0, x: 18 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.36, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                                                    className="grid gap-4 lg:mt-16"
                                                >
                                                    <div className="rounded-[28px] border border-[#d1cdc4] bg-[#fbfaf6] p-4 shadow-[0_26px_48px_-40px_rgba(0,0,0,0.55)]">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="text-sm font-semibold text-[#2d2932]">Source Status</div>
                                                            <span className="rounded-full border border-[#d5d95a] bg-[#ecff49] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1f1f1f]">
                                                                {sourceReady ? "Ready" : "Idle"}
                                                            </span>
                                                        </div>
                                                        <div className="mt-4 space-y-2 text-sm text-[#4e4a53]">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span>Surface</span>
                                                                <span className="font-medium text-[#25212a]">Central showcase</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span>Source</span>
                                                                <span className="truncate font-medium text-[#25212a]">{sourcePrimaryBadge}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span>Shell</span>
                                                                <span className="font-medium text-[#25212a]">Phonk frame</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-[28px] border border-[#d1cdc4] bg-[#f4f2eb] p-4 shadow-[0_26px_48px_-40px_rgba(0,0,0,0.45)]">
                                                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#77726a]">
                                                            Attach Lane
                                                        </div>
                                                        <div className="mt-3 text-sm leading-6 text-[#5a554e]">
                                                            Use the dark plus command on the rail to push this staged clip into the prompt with the streamlined dashboard flow.
                                                        </div>
                                                    </div>
                                                </motion.aside>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-[26px] border border-[#d2cec5] bg-white/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-md sm:inset-x-4 sm:bottom-4 sm:px-4">
                                        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#cbc6bc] bg-[#26232c] text-[#f5f2ea]">
                                            <PanelsTopLeft className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-[#7b756d]">Studio rail</div>
                                            <p className="mt-1 text-xs text-white/46">
                                                Source dock and attach command aligned on one board.
                                            </p>

                                        </div>
                                        <Button
                                            type="button"
                                            onClick={addSourceMode === "link" ? importSourceLink : applyUploadToPrompt}
                                            disabled={!sourceReady}
                                            className="h-10 rounded-full bg-[#26232c] px-4 text-[#f5f2ea] hover:bg-[#34313b] lg:hidden"
                                        >
                                            <PlusIcon className="mr-2 h-4 w-4" />
                                            Attach
                                        </Button>
                                        <div className="rounded-[20px] border border-[#34303a] bg-[#26232c] p-1.5 shadow-[0_20px_34px_-24px_rgba(0,0,0,0.9)]">
                                            <div className="flex items-center gap-1.5">
                                                {uploadStudioUtilities.map(({ label, icon: Icon }) => (
                                                    <span
                                                        key={label}
                                                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] text-white/74"
                                                    >
                                                        <Icon className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">{label}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* TEMPLATES + STYLES */}
            <Sheet open={templatesOpen} onOpenChange={setTemplatesOpen}>
                <SheetContent side="right" className="p-0 flex flex-col overflow-hidden">
                    <SheetHeader className="px-6 pt-6">
                        <SheetTitle>Templates and Styles</SheetTitle>
                        <SheetDescription>
                            Select one active style. Saved in localStorage.
                        </SheetDescription>
                        {process.env.NODE_ENV === "development" && (
                            <div className="mt-1 text-[11px] leading-tight text-white/45">
                                {isLoadingAirtableStylePreviews ? (
                                    <span className="inline-flex items-center gap-2">
                                        <InlineLoadingAnimation size={14} label="Loading Airtable previews" />
                                        <span>Loading Airtable previews on demand...</span>
                                    </span>
                                ) : hasLoadedAirtableStylePreviews
                                        ? `Airtable previews loaded: ${Object.keys(airtableStylePreviews).length} styles`
                                        : "Airtable previews stay dormant until this panel is opened."}
                                {hasLoadedAirtableStylePreviews && Object.keys(airtableStylePreviews).length === 0 && (
                                    <span className="ml-2 text-white/35">
                                        No Airtable previews matched. Using local fallback previews.
                                    </span>
                                )}
                            </div>
                        )}
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-4 space-y-4">
                        <div className="grid gap-3">
                            {STYLE_TEMPLATES.map((template) => {
                                const selected = template.id === activeStyleId;

                                const norm = (s: string) =>
                                    s
                                        .toLowerCase()
                                        .trim()
                                        .replace(/[^a-z0-9]+/g, "-")
                                        .replace(/(^-|-$)/g, "");

                                const candidates = [
                                    template.id,
                                    template.name,
                                    template.id.replace(/^style_/, ""),
                                ].map(norm);

                                const matchedKey = candidates.find((k) => !!airtableStylePreviews[k]);

                                const previewImages = matchedKey
                                    ? airtableStylePreviews[matchedKey]
                                    : template.previewImages;
                                const hasPreviews = previewImages.length > 0;
                                const source =
                                    matchedKey && airtableStylePreviews[matchedKey]?.length > 0
                                        ? "airtable"
                                        : "fallback";
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => {
                                            setActiveStyleId(template.id);
                                            persistActiveStyleId(template.id);
                                            setTemplatesOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left rounded-xl border p-4 transition-colors transition-shadow",
                                            selected
                                                ? "border-purple-400/30 bg-purple-500/10 shadow-[0_0_0_1px_rgba(168,85,247,0.16)]"
                                                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-400/30 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.12)]"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className="hidden sm:grid grid-cols-3 gap-2">
                                                {hasPreviews ? (
                                                    previewImages.slice(0, 3).map((src) => (
                                                        <div
                                                            key={src}
                                                            className="relative h-16 w-24 overflow-hidden rounded-lg border border-white/10"
                                                        >
                                                            {failedImages[src] ? (
                                                                <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-white/40">
                                                                    <ImageIcon className="h-4 w-4" />
                                                                </div>
                                                            ) : (
                                                                <Image
                                                                    src={src}
                                                                    alt=""
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="96px"
                                                                    onError={() =>
                                                                        setFailedImages((m) => ({ ...m, [src]: true }))
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] text-white/40">
                                                        <ImageIcon className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="sm:hidden relative h-24 w-full overflow-hidden rounded-lg border border-white/10">
                                                {hasPreviews ? (
                                                    failedImages[previewImages[0]] ? (
                                                        <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-white/40">
                                                            <ImageIcon className="h-5 w-5" />
                                                        </div>
                                                    ) : (
                                                        <Image
                                                            src={previewImages[0]}
                                                            alt=""
                                                            fill
                                                            className="object-cover"
                                                            sizes="100vw"
                                                            onError={() =>
                                                                setFailedImages((m) => ({
                                                                    ...m,
                                                                    [previewImages[0]]: true,
                                                                }))
                                                            }
                                                        />
                                                    )
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-white/40">
                                                        <ImageIcon className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-sm font-semibold text-white/90">{template.name}</div>
                                                    <div className="flex items-center gap-2">
                                                        {process.env.NODE_ENV === "development" && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[10px] px-2 py-0.5"
                                                            >
                                                                {source === "airtable" ? "Airtable" : "Local"}
                                                            </Badge>
                                                        )}
                                                        {selected ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Style</Badge>}
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-white/45">{template.description}</div>
                                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                    {template.tags.map((tag) => (
                                                        <Badge key={tag} variant="secondary">{tag}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <AnimatePresence>
                {editorLaunchOverlay ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="fixed inset-0 z-[90] bg-black"
                    >
                        <LoadingAnimation
                            message={`Opening ${editorLaunchOverlay.title}. ${editorLaunchOverlay.detail}`}
                            zIndex={90}
                        />
                        {(uploadStatus === 'presigning' || uploadStatus === 'uploading' || uploadStatus === 'retrying' || uploadStatus === 'paused') ? (
                            <div className="fixed inset-x-4 bottom-8 z-[91] mx-auto max-w-[620px] text-center text-xs text-white/62">
                                <div>
                                    {uploadPartLabel ?? `Chunk size ${formatFileSize(R2_MULTIPART_CLIENT_PART_SIZE)}`}
                                </div>
                                <div className="mt-1 font-semibold text-white">{uploadProgress}%</div>
                                {uploadStatus === 'retrying' ? (
                                    <div className="mt-2 text-[#c7d2fe]">
                                        Network timeout — retrying the failed chunk.
                                    </div>
                                ) : null}
                                <div className="pointer-events-auto mt-4 flex justify-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9 rounded-full border-white/12 bg-transparent px-4 text-xs text-white/72 hover:bg-white/[0.08] hover:text-white"
                                        onClick={cancelActiveUpload}
                                    >
                                        Cancel Upload
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                        {uploadStatus === 'error' && uploadErrorDetail ? (
                            <div className="fixed inset-x-4 bottom-8 z-[91] mx-auto max-w-[620px] text-center text-sm text-red-100">
                                {uploadErrorDetail}
                            </div>
                        ) : null}
                    </motion.div>
                ) : null}
            </AnimatePresence>

        </div>
    );
}

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
}

function ActionButton({ icon, label }: ActionButtonProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    
    return (
        <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full border border-neutral-800 text-neutral-400 hover:text-white transition-all relative overflow-hidden group"
        >
            <div className="relative z-10 flex items-center gap-2">
                {icon}
                <span className="text-xs relative z-10">{label}</span>
            </div>
            
            <AnimatePresence>
                {isHovered && (
                    <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-indigo-500/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>
            
            <motion.span 
                className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500"
                initial={{ width: 0 }}
                whileHover={{ width: "100%" }}
                transition={{ duration: 0.3 }}
            />
        </motion.button>
    );
}

const rippleKeyframes = `
@keyframes ripple {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = rippleKeyframes;
    document.head.appendChild(style);
}
