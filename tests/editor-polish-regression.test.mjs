import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readLogoAlphaStats(logoPath) {
  const script = [
    "import json, sys",
    "from PIL import Image",
    'image = Image.open(sys.argv[1]).convert("RGBA")',
    'alpha = image.getchannel("A")',
    "values = list(alpha.getdata())",
    "print(json.dumps({",
    '  "transparentPixels": sum(1 for value in values if value <= 4),',
    '  "opaquePixels": sum(1 for value in values if value >= 250),',
    '  "totalPixels": len(values),',
    "}))",
  ].join("\n");

  return JSON.parse(
    execFileSync("python", ["-c", script, logoPath], { encoding: "utf8" }),
  );
}

function run() {
  const rootLayout = read("app/layout.tsx");
  assert.equal(rootLayout.includes("@/components/webgl/SceneManager"), false);
  assert.equal(rootLayout.includes("<SceneManager />"), false);

  const packageJson = read("package.json");
  assert.equal(packageJson.includes("@react-three"), false);
  assert.equal(packageJson.includes('"three"'), false);
  assert.equal(
    existsSync(join(root, "components/webgl/SceneManager.tsx")),
    false,
  );
  assert.equal(existsSync(join(root, "hooks/useWebGLSupport.ts")), false);
  assert.equal(existsSync(join(root, "lib/webgl/config.ts")), false);

  const sidebarFiles = [
    "components/dashboard-sidebar.tsx",
    "components/editor/EditorHamburgerSidebar.tsx",
    "app/components/editor/mobile/EditorNavDrawer.tsx",
    "app/components/mobile/MobileNavDrawer.tsx",
    "app/editor/components/sidebar-drawer.tsx",
  ];
  for (const sidebarFile of sidebarFiles) {
    const source = read(sidebarFile);
    assert.equal(source.includes("Navigation Live"), false, sidebarFile);
    assert.equal(
      source.includes("The active blade follows hover"),
      false,
      sidebarFile,
    );
    assert.equal(source.includes("Hover a row to preview"), false, sidebarFile);
    assert.equal(
      source.includes("Creative operating system"),
      false,
      sidebarFile,
    );
  }

  const editorIndexPage = read("app/editor/page.tsx");
  assert.match(editorIndexPage, /getMostRecentProject/);
  assert.match(editorIndexPage, /normalizeRequestedWorkspaceTab/);
  assert.match(editorIndexPage, /tabSuffix/);
  assert.match(
    editorIndexPage,
    /`\/editor\/\$\{recentProject\.id\}\$\{tabSuffix\}`/,
  );

  const motionEditorPage = read("app/editor/motion/page.tsx");
  assert.equal(motionEditorPage.includes("redirect('/editor')"), false);
  assert.equal(motionEditorPage.includes("MotionCanvas"), true);
  assert.equal(motionEditorPage.includes("NodeGraphProvider"), true);
  assert.equal(motionEditorPage.includes("WorkspaceNavBar"), true);
  assert.match(motionEditorPage, /activeItem="Motion"/);
  assert.match(motionEditorPage, /\/editor\?tab=Editor/);
  assert.match(motionEditorPage, /\/editor\?tab=Music/);
  assert.equal(motionEditorPage.includes("z-[9999]"), true);
  assert.equal(
    existsSync(join(root, "app/editor/motion/components/motion-canvas.tsx")),
    true,
  );
  assert.equal(
    existsSync(join(root, "app/editor/motion/hooks/use-node-graph.ts")),
    true,
  );

  const animeNavbar = read("components/ui/anime-navbar.tsx");
  assert.equal(animeNavbar.includes("TextReveal"), false);
  assert.match(animeNavbar, /translate3d\(\$\{indicatorStyle\.left\}px,0,0\)/);

  const editorHeader = read("components/editor/EditorHeader.tsx");
  assert.match(editorHeader, /defaultActive=\{activeWorkspaceTab\}/);

  const editorTopBar = read("components/editor/EditorTopBar.tsx");
  assert.equal(editorTopBar.includes("BackButton"), false);
  assert.equal(editorTopBar.includes("PROMETHEUS"), false);
  assert.equal(editorTopBar.includes("/editor"), false);
  assert.equal(editorTopBar.includes("glass-button hidden h-8"), false);
  assert.match(editorTopBar, /bg-transparent text-text-secondary/);

  const editorProjectPage = read("app/editor/[id]/page.tsx");
  assert.match(editorProjectPage, /function MagneticSparkleButton/);
  assert.equal(editorProjectPage.includes("AiLampDialog"), false);
  assert.equal(editorProjectPage.includes("setIsAiLampOpen"), false);
  assert.match(editorProjectPage, /router\.push\('\/editor\/motion'\)/);
  assert.match(editorProjectPage, /if \(tab === 'Motion'\)/);
  assert.match(editorProjectPage, /useSearchParams/);
  assert.match(editorProjectPage, /normalizeWorkspaceTabParam/);
  assert.equal(
    editorProjectPage.includes('text="Project" delay={0.03}'),
    false,
  );
  assert.equal(editorProjectPage.includes('text="Prompt" delay={0.06}'), false);
  assert.equal(editorProjectPage.includes("<StagedMusicRail"), false);
  assert.equal(editorProjectPage.includes("latestMusicBlock"), false);
  assert.equal(editorProjectPage.includes("LEFT_TABS"), false);
  assert.equal(editorProjectPage.includes("leftTab"), false);
  assert.equal(editorProjectPage.includes("isLeftPanelCollapsed"), false);
  assert.equal(editorProjectPage.includes("renderLeftPanel"), false);
  assert.equal(editorProjectPage.includes("EditWorkflowPanel"), false);
  assert.equal(editorProjectPage.includes("Upload a source video"), true);
  assert.equal(
    editorProjectPage.includes("Video processing - ${sourceLabel}"),
    false,
  );
  assert.match(editorProjectPage, /const isSourceStageActivelyLoading =/);
  assert.match(
    editorProjectPage,
    /sourceStagePhase === 'staging_local_preview'/,
  );
  assert.match(editorProjectPage, /sourceStagePhase === 'persisting'/);
  assert.match(
    editorProjectPage,
    /isSourceStageActivelyLoading=\{isSourceStageActivelyLoading\}/,
  );

  assert.equal(
    existsSync(join(root, "components/editor/ai-lamp-dialog.tsx")),
    false,
  );

  const previewCanvas = read("components/editor/PreviewCanvas.tsx");
  assert.equal(
    previewCanvas.includes(
      "previewUrl || hasSourceAsset ? 'loading' : 'empty'",
    ),
    false,
  );
  assert.match(previewCanvas, /isSourceStageActivelyLoading: boolean/);
  assert.match(
    previewCanvas,
    /status=\{sourceStageError \? 'error' : isSourceStageActivelyLoading \? 'loading' : 'empty'\}/,
  );
  assert.equal(
    previewCanvas.includes("border border-white/8 bg-[#050505] p-2"),
    false,
  );
  assert.equal(
    previewCanvas.includes("border border-white/10 bg-[#000]"),
    false,
  );

  const sourceStagePlaceholder = read(
    "components/editor/source-stage-placeholder.tsx",
  );
  assert.match(sourceStagePlaceholder, /SourceAddGlyph/);
  assert.match(sourceStagePlaceholder, /border-dashed/);
  assert.equal(
    sourceStagePlaceholder.includes("MinimalTypographicLoader"),
    false,
  );
  assert.equal(
    sourceStagePlaceholder.includes("prometheus-infinity-loader"),
    false,
  );
  assert.match(sourceStagePlaceholder, /aria-busy=\{isLoading\}/);
  assert.match(
    sourceStagePlaceholder,
    /pointer-events-none absolute inset-0 z-0 bg-transparent/,
  );
  assert.equal(sourceStagePlaceholder.includes("bg-[#07070a]"), false);

  const logoAlpha = readLogoAlphaStats(
    join(root, "public/branding/prometheus-logo-no-bg.png"),
  );
  assert.ok(logoAlpha.transparentPixels / logoAlpha.totalPixels > 0.25);
  assert.ok(logoAlpha.opaquePixels / logoAlpha.totalPixels > 0.05);

  const landingPage = read("app/page.tsx");
  assert.equal(
    landingPage.includes("Deliverables included with purchase"),
    false,
  );
  assert.equal(
    landingPage.includes("What Prometheus Studio customers receive"),
    false,
  );
  assert.equal(landingPage.includes("HD Video Exports"), false);

  const uploadInterface = read("components/video-upload-interface.tsx");
  assert.equal(
    uploadInterface.includes("Deliverables included with purchase"),
    false,
  );
  assert.equal(
    uploadInterface.includes("What Prometheus Studio customers receive"),
    false,
  );
  assert.equal(uploadInterface.includes("HD Video Exports"), false);
  assert.equal(
    uploadInterface.includes(
      "Prometheus Studio is a professional video editing and production workspace for filmmakers.",
    ),
    false,
  );
  assert.equal(uploadInterface.includes('label: "Delivery"'), false);

  const inspectorPanel = read("components/editor/InspectorPanel.tsx");
  assert.equal(inspectorPanel.includes("Settings Node"), false);
  assert.equal(inspectorPanel.includes("Source Intelligence"), false);
  assert.equal(inspectorPanel.includes("Global Scale"), false);
  assert.equal(inspectorPanel.includes("Offset X"), false);
  assert.equal(inspectorPanel.includes("Offset Y"), false);
  assert.equal(inspectorPanel.includes("H.264 High 10"), false);
  assert.equal(inspectorPanel.includes("lg:col-span-1"), false);
  assert.equal(inspectorPanel.includes("lg:col-span-2"), false);

  const sharedLoader = read("components/ui/minimal-typographic-loader.tsx");
  assert.match(sharedLoader, /PrometheusApertureLoader/);
  assert.equal(sharedLoader.includes("next/image"), false);
  assert.equal(
    sharedLoader.includes("/loaders/prometheus-infinity-loader.gif"),
    false,
  );
  assert.match(sharedLoader, /prometheus-aperture-loader/);
  assert.equal(sharedLoader.includes("gsap"), false);
  assert.equal(sharedLoader.includes("bg-[#000000]"), false);
  assert.match(sharedLoader, /bg-transparent/);
  assert.match(sharedLoader, /pointer-events-none/);
  assert.match(sharedLoader, /ambient = true/);
  assert.equal(sharedLoader.includes("mix-blend-screen"), false);
  assert.equal(sharedLoader.includes("mask-image:radial-gradient"), false);
  assert.equal(sharedLoader.includes("rounded-[28px]"), false);

  const musicPlayer = read("components/ui/music-player.tsx");
  assert.match(musicPlayer, /overflow-hidden/);
  assert.match(musicPlayer, /truncate/);
  assert.match(musicPlayer, /title=\{artistName\}/);

  const editorLoading = read("app/editor/loading.tsx");
  assert.match(editorLoading, /EditorLoadingScreen/);
  assert.equal(editorLoading.includes("animate-spin"), false);

  const workspaceFrame = read("components/workspace-frame.tsx");
  assert.match(workspaceFrame, /data-lenis-prevent/);
  assert.match(workspaceFrame, /overflow-y-auto/);
  assert.match(workspaceFrame, /touch-pan-y/);
  assert.match(workspaceFrame, /speed=\{0\.08\}/);

  const awwwardsSidebar = read("components/sidebar/AwwwardsSidebar.tsx");
  assert.match(awwwardsSidebar, /href: "\/editor\/motion"/);
  assert.match(awwwardsSidebar, /href: "\/projects"/);
  assert.match(awwwardsSidebar, /router\.back\(\)/);
  assert.match(awwwardsSidebar, /New project/);
  assert.equal(awwwardsSidebar.includes("WORKSPACE"), false);
  assert.equal(awwwardsSidebar.includes("Create workspace item"), false);
  assert.equal(awwwardsSidebar.includes("setActive"), false);

  const hamburgerSidebar = read("components/editor/EditorHamburgerSidebar.tsx");
  assert.match(hamburgerSidebar, /href: ["']\/editor\/motion["']/);
  assert.match(hamburgerSidebar, /router\.back\(\)/);
  assert.match(hamburgerSidebar, /New project/);

  const mobileNavDrawer = read(
    "app/components/editor/mobile/EditorNavDrawer.tsx",
  );
  assert.match(mobileNavDrawer, /router\.push\('\/editor\/motion'\)/);

  const mobileSidebarDrawer = read("app/editor/components/sidebar-drawer.tsx");
  assert.match(mobileSidebarDrawer, /router\.push\('\/editor\/motion'\)/);
  assert.match(mobileSidebarDrawer, /panel\.id !== 'motion'/);

  const editorConnectionLine = read("components/editor/ConnectionLine.tsx");
  assert.equal(editorConnectionLine.includes("flowLine_1s"), false);
  assert.match(editorConnectionLine, /flowLine_5\.5s/);

  const motionBrainCanvas = read("components/editor/MotionBrainCanvas.tsx");
  assert.equal(motionBrainCanvas.includes("duration: 1.5"), false);
  assert.match(motionBrainCanvas, /duration: 7\.2/);

  const motionConnectionLine = read(
    "app/editor/motion/components/connection-line.tsx",
  );
  assert.equal(motionConnectionLine.includes("'0.9s'"), false);
  assert.equal(motionConnectionLine.includes("'3.8s'"), false);
  assert.match(motionConnectionLine, /'8\.5s'/);

  const soundtrackCard = read("components/editor/soundtrack-card.tsx");
  assert.equal(soundtrackCard.includes("animate-marquee"), false);
  assert.equal(soundtrackCard.includes("ArtistMarquee"), false);
  assert.match(soundtrackCard, /truncate/);

  const songScroller = read("components/editor/inertial-song-scroller.tsx");
  assert.equal(songScroller.includes("shouldReleaseWheelToNativeScroll"), true);
  assert.match(songScroller, /if \(shouldReleaseWheelToNativeScroll/);
  assert.equal(songScroller.includes("touch-none overflow-hidden"), false);
}

run();
