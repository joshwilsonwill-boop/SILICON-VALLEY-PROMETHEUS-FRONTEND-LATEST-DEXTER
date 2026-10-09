/** The Studio mounts these namespaced styles with its portal, without a route CSS request. */
export const thumbnailWorkspaceClasses = {
  studio: 'prom-thumbnail-studio',
  backdrop: 'prom-thumbnail-backdrop',
  window: 'prom-thumbnail-window',
  header: 'prom-thumbnail-header',
  identity: 'prom-thumbnail-identity',
  mark: 'prom-thumbnail-mark',
  title: 'prom-thumbnail-title',
  project: 'prom-thumbnail-project',
  headerActions: 'prom-thumbnail-headerActions',
  status: 'prom-thumbnail-status',
  statusDot: 'prom-thumbnail-statusDot',
  iconButton: 'prom-thumbnail-iconButton',
  body: 'prom-thumbnail-body',
  canvasColumn: 'prom-thumbnail-canvasColumn',
  previewSourceLayout: 'prom-thumbnail-previewSourceLayout',
  previewColumn: 'prom-thumbnail-previewColumn',
  sourceFramesPanel: 'prom-thumbnail-sourceFramesPanel',
  canvasToolbar: 'prom-thumbnail-canvasToolbar',
  previewIdentity: 'prom-thumbnail-previewIdentity',
  previewSparkle: 'prom-thumbnail-previewSparkle',
  previewEyebrow: 'prom-thumbnail-previewEyebrow',
  subtitle: 'prom-thumbnail-subtitle',
  aspectGroup: 'prom-thumbnail-aspectGroup',
  viewGroup: 'prom-thumbnail-viewGroup',
  aspectButton: 'prom-thumbnail-aspectButton',
  stage: 'prom-thumbnail-stage',
  artboard: 'prom-thumbnail-artboard',
  stageImage: 'prom-thumbnail-stageImage',
  stageSource: 'prom-thumbnail-stageSource',
  stageGlare: 'prom-thumbnail-stageGlare',
  guides: 'prom-thumbnail-guides',
  empty: 'prom-thumbnail-empty',
  generating: 'prom-thumbnail-generating',
  spin: 'prom-thumbnail-spin',
  previewMeta: 'prom-thumbnail-previewMeta',
  metaLabel: 'prom-thumbnail-metaLabel',
  viewButton: 'prom-thumbnail-viewButton',
  sectionHeading: 'prom-thumbnail-sectionHeading',
  count: 'prom-thumbnail-count',
  textButton: 'prom-thumbnail-textButton',
  sectionActions: 'prom-thumbnail-sectionActions',
  frameStrip: 'prom-thumbnail-frameStrip',
  frame: 'prom-thumbnail-frame',
  frameTime: 'prom-thumbnail-frameTime',
  frameSelected: 'prom-thumbnail-frameSelected',
  skeleton: 'prom-thumbnail-skeleton',
  templates: 'prom-thumbnail-templates',
  referenceRail: 'prom-thumbnail-referenceRail',
  referenceFilters: 'prom-thumbnail-referenceFilters',
  referenceBrowseGrid: 'prom-thumbnail-referenceBrowseGrid',
  referenceTile: 'prom-thumbnail-referenceTile',
  referenceInfo: 'prom-thumbnail-referenceInfo',
  referenceVisual: 'prom-thumbnail-referenceVisual',
  referenceImage: 'prom-thumbnail-referenceImage',
  referenceGrain: 'prom-thumbnail-referenceGrain',
  referenceName: 'prom-thumbnail-referenceName',
  referenceCue: 'prom-thumbnail-referenceCue',
  inspectorReferences: 'prom-thumbnail-inspectorReferences',
  variants: 'prom-thumbnail-variants',
  variant: 'prom-thumbnail-variant',
  inspector: 'prom-thumbnail-inspector',
  tabs: 'prom-thumbnail-tabs',
  tab: 'prom-thumbnail-tab',
  panel: 'prom-thumbnail-panel',
  panelIntro: 'prom-thumbnail-panelIntro',
  createPanel: 'prom-thumbnail-createPanel',
  createHeadline: 'prom-thumbnail-createHeadline',
  field: 'prom-thumbnail-field',
  label: 'prom-thumbnail-label',
  input: 'prom-thumbnail-input',
  select: 'prom-thumbnail-select',
  textarea: 'prom-thumbnail-textarea',
  createDetails: 'prom-thumbnail-createDetails',
  createDetailsContent: 'prom-thumbnail-createDetailsContent',
  hint: 'prom-thumbnail-hint',
  chips: 'prom-thumbnail-chips',
  chip: 'prom-thumbnail-chip',
  hook: 'prom-thumbnail-hook',
  backgroundRow: 'prom-thumbnail-backgroundRow',
  backgroundSwatch: 'prom-thumbnail-backgroundSwatch',
  palette: 'prom-thumbnail-palette',
  swatch: 'prom-thumbnail-swatch',
  colorInput: 'prom-thumbnail-colorInput',
  upload: 'prom-thumbnail-upload',
  hiddenInput: 'prom-thumbnail-hiddenInput',
  referenceStrip: 'prom-thumbnail-referenceStrip',
  reference: 'prom-thumbnail-reference',
  qualityGroup: 'prom-thumbnail-qualityGroup',
  quality: 'prom-thumbnail-quality',
  range: 'prom-thumbnail-range',
  footer: 'prom-thumbnail-footer',
  primary: 'prom-thumbnail-primary',
  secondary: 'prom-thumbnail-secondary',
  exportRow: 'prom-thumbnail-exportRow',
  error: 'prom-thumbnail-error',
  success: 'prom-thumbnail-success',
  footerHint: 'prom-thumbnail-footerHint',
  chatContainer: 'prom-thumbnail-chatContainer',
  chatContextCard: 'prom-thumbnail-chatContextCard',
  chatContextThumb: 'prom-thumbnail-chatContextThumb',
  chatContextInfo: 'prom-thumbnail-chatContextInfo',
  chatContextTitle: 'prom-thumbnail-chatContextTitle',
  chatContextSubtitle: 'prom-thumbnail-chatContextSubtitle',
  chatMessageList: 'prom-thumbnail-chatMessageList',
  chatBubble: 'prom-thumbnail-chatBubble',
  chatBubbleUser: 'prom-thumbnail-chatBubbleUser',
  chatBubbleAssistant: 'prom-thumbnail-chatBubbleAssistant',
  chatBubbleSender: 'prom-thumbnail-chatBubbleSender',
  chatPromptChips: 'prom-thumbnail-chatPromptChips',
  chatPromptChip: 'prom-thumbnail-chatPromptChip',
  chatInputBox: 'prom-thumbnail-chatInputBox',
  chatTextarea: 'prom-thumbnail-chatTextarea',
  chatInputFooter: 'prom-thumbnail-chatInputFooter',
  chatSendBtn: 'prom-thumbnail-chatSendBtn',
  chatRefineBadge: 'prom-thumbnail-chatRefineBadge',
  refineChatButton: 'prom-thumbnail-refineChatButton',
} as const

export const thumbnailWorkspaceCss = String.raw`
.prom-thumbnail-studio, .prom-thumbnail-studio *, .prom-thumbnail-studio *::before, .prom-thumbnail-studio *::after { box-sizing: border-box; }
.prom-thumbnail-studio { --studio-accent: var(--light-ui-accent, #7ff2d4); --studio-border: var(--light-ui-border, rgba(255,255,255,.09)); --studio-muted: var(--light-ui-muted, #919a9e); position: fixed; inset: 0; z-index: 140; display: grid; place-items: center; padding: 20px; color: var(--light-ui-text, #f0f3f3); font-family: var(--font-ui), 'Segoe UI', sans-serif; }
.prom-thumbnail-backdrop { position: absolute; inset: 0; background: rgba(2,5,7,.88); backdrop-filter: blur(14px); }
.prom-thumbnail-window { position: relative; width: min(1440px,100%); height: min(940px,94dvh); display: flex; flex-direction: column; overflow: hidden; background: var(--light-ui-surface, #0b1013); border: 1px solid var(--studio-border); border-radius: 16px; box-shadow: var(--light-ui-dialog-shadow, 0 40px 130px #0009); }
.prom-thumbnail-window button, .prom-thumbnail-window input, .prom-thumbnail-window select, .prom-thumbnail-window textarea { font: inherit; }
.prom-thumbnail-window button { cursor: pointer; transition: background .18s, border-color .18s, color .18s; }
.prom-thumbnail-window button:disabled { cursor: not-allowed; opacity: .4; }
.prom-thumbnail-window :is(button,input,textarea,select):focus-visible { outline: 2px solid var(--studio-accent); outline-offset: 3px; }
.prom-thumbnail-header { min-height: 76px; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--studio-border); background: var(--light-ui-surface, #101619); }
.prom-thumbnail-identity { display: flex; gap: 12px; align-items: center; min-width: 0; }
.prom-thumbnail-mark { display: grid; place-items: center; width: 38px; height: 38px; color: var(--studio-accent); border: 1px solid var(--light-ui-border, #7ff2d425); background: #7ff2d40a; border-radius: 10px; flex: none; }
.prom-thumbnail-title { font-size: 20px; font-weight: 650; letter-spacing: -.6px; margin: 0; }
.prom-thumbnail-project { margin: 3px 0 0; font-size: 11px; color: var(--studio-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
.prom-thumbnail-headerActions { display: flex; gap: 8px; align-items: center; }
.prom-thumbnail-status { display: inline-flex; gap: 6px; align-items: center; color: var(--studio-muted); font-size: 11px; margin-right: 10px; }
.prom-thumbnail-statusDot { width: 5px; height: 5px; background: var(--studio-accent); border-radius: 50%; }
.prom-thumbnail-iconButton { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--studio-border); background: transparent; color: var(--light-ui-muted, #aeb9bc); border-radius: 7px; }
.prom-thumbnail-iconButton:hover { background: var(--light-ui-surface, #ffffff08); color: var(--light-ui-text, #fff); }
.prom-thumbnail-body { display: grid; grid-template-columns: minmax(0,1fr) 380px; min-height: 0; flex: 1; }
.prom-thumbnail-canvasColumn { display: flex; flex-direction: column; min-width: 0; overflow-y: auto; padding: 22px 26px 20px; scrollbar-width: thin; scrollbar-color: #364146 transparent; }
.prom-thumbnail-canvasToolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; padding: 10px 12px; border: 1px solid var(--light-ui-border, #ffffff11); border-radius: 9px; background: var(--light-ui-subtle, linear-gradient(110deg,#141d22,#0e1519 66%,#101a20)); box-shadow: var(--light-ui-panel-shadow, 0 10px 26px #0003,inset 0 1px #ffffff09); }
.prom-thumbnail-previewIdentity { display: flex; align-items: center; gap: 10px; min-width: 0; }
.prom-thumbnail-previewSparkle { display: grid; place-items: center; width: 30px; height: 30px; flex: none; color: var(--studio-accent); border: 1px solid var(--light-ui-border, #7ff2d42e); background: #7ff2d40d; border-radius: 8px; }
.prom-thumbnail-previewEyebrow { display: block; color: var(--light-ui-muted, #7f9299); font-size: 8px; letter-spacing: .16em; font-weight: 650; margin-bottom: 2px; }
.prom-thumbnail-subtitle { margin: 0; font-size: 12px; color: var(--light-ui-text, #e0e7e9); line-height: 1.45; font-weight: 550; }
.prom-thumbnail-aspectGroup, .prom-thumbnail-viewGroup { display: flex; gap: 4px; }
.prom-thumbnail-aspectButton { padding: 7px 10px; min-height: 32px; background: var(--light-ui-surface, #ffffff03); color: var(--light-ui-muted, #a5aeb2); border: 1px solid var(--studio-border); border-radius: 6px; font-size: 10px !important; font-variant-numeric: tabular-nums; }
.prom-thumbnail-aspectButton[aria-pressed=true] { border-color: var(--light-ui-border, #7ff2d45c); color: var(--studio-accent); background: #7ff2d40b; }
.prom-thumbnail-stage { position: relative; display: grid; place-items: center; min-height: clamp(320px,42vh,520px); flex: none; perspective: 1400px; background: #05090c; border: 1px solid #263239; border-radius: 9px; overflow: hidden; background-image: radial-gradient(ellipse at center,#1b293244,transparent 70%); }
.prom-thumbnail-stage[data-ratio="9:16"], .prom-thumbnail-stage[data-ratio="2:3"] { min-height: clamp(410px,55vh,650px); }
.prom-thumbnail-stage[data-ratio="1:1"] { min-height: clamp(360px,47vh,560px); }
.prom-thumbnail-artboard { position: relative; flex: none; overflow: hidden; border: 1px solid #ffffff30; border-radius: 4px; background: #090f14; box-shadow: 0 28px 70px #000a,0 0 42px #00b9f21c; transform-style: preserve-3d; transition: width .48s cubic-bezier(.2,.8,.2,1),height .48s cubic-bezier(.2,.8,.2,1),transform .16s ease-out,box-shadow .3s ease; will-change: width,height,transform; }
.prom-thumbnail-artboard::after { content: ''; position: absolute; inset: 0; pointer-events: none; border: 1px solid #ffffff18; }
.prom-thumbnail-stageImage { display: block; width: 100%; height: 100%; object-fit: cover; }
.prom-thumbnail-stageSource { object-fit: contain; }
.prom-thumbnail-stageGlare { position: absolute; inset: 0; pointer-events: none; opacity: .42; background: radial-gradient(ellipse at var(--pointer-x,50%) var(--pointer-y,50%),#ffffff28,transparent 48%); mix-blend-mode: screen; transition: opacity .3s ease; }
.prom-thumbnail-artboard:hover { box-shadow: 0 34px 82px #000c,0 0 52px #00b9f227; }
.prom-thumbnail-guides { position: absolute; inset: 6%; pointer-events: none; border: 1px dashed #ffffff85; }
.prom-thumbnail-guides::before, .prom-thumbnail-guides::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to right,transparent 33.2%,#ffffff45 33.2%,#ffffff45 33.4%,transparent 33.4%,transparent 66.5%,#ffffff45 66.5%,#ffffff45 66.7%,transparent 66.7%); }
.prom-thumbnail-guides::after { background: linear-gradient(to bottom,transparent 33.2%,#ffffff45 33.2%,#ffffff45 33.4%,transparent 33.4%,transparent 66.5%,#ffffff45 66.5%,#ffffff45 66.7%,transparent 66.7%); }
.prom-thumbnail-empty { padding: 44px 24px; text-align: center; color: var(--light-ui-muted, #9aabb1); display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 13px; }
.prom-thumbnail-empty strong { color: var(--light-ui-text, #e9eef0); font-size: 17px; font-weight: 550; }
.prom-thumbnail-empty p { max-width: 290px; margin: 0; line-height: 1.7; }
.prom-thumbnail-generating { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; background: var(--light-ui-surface, #061014d9); backdrop-filter: blur(8px); font-size: 14px; }
.prom-thumbnail-generating small { color: var(--light-ui-muted, #aab9bd); font-size: 12px; }
.prom-thumbnail-spin { animation: prom-thumbnail-spin 1s linear infinite; }
@keyframes prom-thumbnail-spin { to { transform: rotate(360deg); } }
.prom-thumbnail-previewMeta { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin: 10px 0 21px; font-size: 10px; color: var(--light-ui-muted, #94a0a6); }
.prom-thumbnail-metaLabel { display: inline-flex; gap: 6px; align-items: center; }
.prom-thumbnail-viewButton { background: transparent; border: 0; border-radius: 4px; color: var(--light-ui-muted, #929da3); padding: 5px 7px; font-size: 10px !important; }
.prom-thumbnail-viewButton[aria-pressed=true] { color: var(--studio-accent); background: #7ff2d40c; }
.prom-thumbnail-sectionHeading { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 10px; }
.prom-thumbnail-sectionHeading h2, .prom-thumbnail-sectionHeading h3 { margin: 0; font-size: 12px; font-weight: 550; }
.prom-thumbnail-count { color: var(--light-ui-muted, #8d999f); font-size: 10px; padding: 3px 6px; background: var(--light-ui-surface, #ffffff05); border: 1px solid var(--studio-border); border-radius: 4px; margin-left: 8px; }
.prom-thumbnail-textButton { background: transparent; border: 0; color: var(--studio-accent); padding: 3px 0; font-size: 11px !important; display: flex; align-items: center; gap: 5px; }
.prom-thumbnail-sectionActions { display: flex; align-items: center; gap: 9px; }
.prom-thumbnail-sectionActions .prom-thumbnail-iconButton { width: 25px; height: 25px; }
.prom-thumbnail-frameStrip { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: thin; scrollbar-color: #344047 transparent; padding: 2px 2px 8px; scroll-snap-type: x proximity; }
.prom-thumbnail-frame { position: relative; flex: 0 0 102px; height: 62px; overflow: hidden; border: 1px solid var(--studio-border); border-radius: 6px; background: #172026; scroll-snap-align: start; padding: 0; }
.prom-thumbnail-frame img { width: 100%; height: 100%; object-fit: cover; opacity: .72; }
.prom-thumbnail-frame[aria-pressed=true] { border-color: var(--studio-accent); box-shadow: 0 0 0 1px var(--studio-accent); }
.prom-thumbnail-frame[aria-pressed=true] img, .prom-thumbnail-frame:hover img { opacity: 1; }
.prom-thumbnail-frameTime { position: absolute; bottom: 4px; right: 4px; padding: 1px 4px; border-radius: 3px; background: #000c; color: #fff; font-size: 9px; font-variant-numeric: tabular-nums; }
.prom-thumbnail-frameSelected { position: absolute; top: 4px; left: 4px; display: grid; place-items: center; width: 13px; height: 13px; background: var(--studio-accent); color: var(--light-ui-on-accent, #0b171b); border-radius: 50%; }
.prom-thumbnail-skeleton { flex: 0 0 102px; height: 62px; border-radius: 6px; background: linear-gradient(100deg,#18232a,#263139,#18232a); background-size: 200% 100%; animation: prom-thumbnail-shimmer 2s infinite; }
@keyframes prom-thumbnail-shimmer { to { background-position: -200% 0; } }
.prom-thumbnail-templates { margin-top: 16px; }
.prom-thumbnail-referenceRail { display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 10px; scroll-snap-type: x mandatory; scrollbar-width: thin; scrollbar-color: #344047 transparent; }
.prom-thumbnail-referenceFilters { display: grid; grid-template-columns: minmax(0,1fr) minmax(170px,.45fr); gap: 8px; margin: 0 0 10px; }
.prom-thumbnail-referenceBrowseGrid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; max-height: min(62vh,560px); overflow: auto; padding: 3px 5px 10px 2px; scrollbar-width: thin; scrollbar-color: #344047 transparent; }
.prom-thumbnail-referenceBrowseGrid .prom-thumbnail-referenceTile { width: 100%; }
.prom-thumbnail-referenceBrowseGrid .prom-thumbnail-referenceInfo { min-height: 50px; }
.prom-thumbnail-referenceTile { flex: 0 0 clamp(168px,22%,236px); min-width: 0; padding: 0; text-align: left; color: var(--light-ui-muted, #a5afb3); background: transparent; border: 0; scroll-snap-align: start; }
.prom-thumbnail-referenceVisual { position: relative; display: block; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 7px; border: 1px solid #2b373e; background: #10191e; isolation: isolate; }
.prom-thumbnail-referenceImage { display: block; width: 100%; height: 100%; object-fit: cover; transform: scale(1.025); }
.prom-thumbnail-referenceTile[data-revealed="false"] .prom-thumbnail-referenceVisual { opacity: 0; }
.prom-thumbnail-referenceTile[data-revealed="true"] .prom-thumbnail-referenceVisual { animation: prom-thumbnail-imageReveal 880ms cubic-bezier(.42,0,.58,1) both; animation-delay: calc(var(--reveal-index,0) * 76ms); }
@keyframes prom-thumbnail-imageReveal { 0% { clip-path: inset(44% 0 44% 0 round 8px); filter: blur(12px) saturate(.6); transform: scale(1.07); opacity: .2; } 58% { clip-path: inset(0 0 0 0 round 8px); filter: blur(0) saturate(1.12); opacity: 1; } 100% { clip-path: inset(0 0 0 0 round 8px); filter: blur(0) saturate(1); transform: scale(1); opacity: 1; } }
.prom-thumbnail-referenceGrain { position: absolute; inset: 0; pointer-events: none; opacity: .16; mix-blend-mode: soft-light; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.86' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.62'/%3E%3C/svg%3E"); }
.prom-thumbnail-referenceTile[aria-pressed="true"] .prom-thumbnail-referenceVisual { border-color: var(--studio-accent); box-shadow: 0 0 0 1px var(--studio-accent),0 10px 28px #0008; }
.prom-thumbnail-referenceTile[aria-pressed="true"] .prom-thumbnail-referenceName { color: var(--light-ui-text, #e3f1ed); }
.prom-thumbnail-referenceInfo { display: block; padding: 7px 2px 0; }
.prom-thumbnail-referenceName { display: block; font-size: 10px; line-height: 1.4; }
.prom-thumbnail-referenceCue { display: block; margin-top: 2px; color: var(--light-ui-muted, #819097); font-size: 9px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.prom-thumbnail-inspectorReferences { flex-direction: column; max-height: 480px; padding-right: 4px; }
.prom-thumbnail-inspectorReferences .prom-thumbnail-referenceTile { flex: none; display: grid; grid-template-columns: 112px minmax(0,1fr); gap: 9px; align-items: center; width: 100%; }
.prom-thumbnail-inspectorReferences .prom-thumbnail-referenceInfo { padding: 0; }
.prom-thumbnail-inspectorReferences .prom-thumbnail-referenceName { font-size: 11px; }
.prom-thumbnail-inspectorReferences .prom-thumbnail-referenceVisual { width: 112px; }
.prom-thumbnail-variants { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--studio-border); }
.prom-thumbnail-variant { flex: 0 0 120px; height: 72px; }
.prom-thumbnail-inspector { min-height: 0; display: flex; flex-direction: column; border-left: 1px solid var(--studio-border); background: var(--light-ui-surface, #101619); }
.prom-thumbnail-tabs { display: flex; flex: none; padding: 9px 12px 0; border-bottom: 1px solid var(--studio-border); gap: 4px; }
.prom-thumbnail-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 8px; color: var(--light-ui-muted, #919ca2); background: transparent; border: 0; border-bottom: 2px solid transparent; font-size: 12px !important; }
.prom-thumbnail-tab[aria-pressed=true] { color: var(--studio-accent); border-bottom-color: var(--studio-accent); background: linear-gradient(0deg,#7ff2d409,transparent); }
.prom-thumbnail-panel { padding: 21px 22px; flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #364146 transparent; }
.prom-thumbnail-panelIntro { margin-bottom: 20px; }
.prom-thumbnail-panelIntro h2 { font-size: 15px; letter-spacing: -.3px; font-weight: 600; margin: 0 0 5px; }
.prom-thumbnail-panelIntro p { margin: 0; font-size: 11px; color: var(--light-ui-muted, #9aa6ac); line-height: 1.7; }
.prom-thumbnail-createPanel .prom-thumbnail-panelIntro { margin-bottom: 24px; }
.prom-thumbnail-createHeadline { margin-bottom: 20px; }
.prom-thumbnail-field { margin-bottom: 18px; }
.prom-thumbnail-label { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; color: var(--light-ui-text, #d0d8dc); font-size: 11px; font-weight: 550; margin-bottom: 7px; }
.prom-thumbnail-label small { font-size: 10px; color: var(--light-ui-muted, #8d9ba1); font-weight: 400; }
.prom-thumbnail-createHeadline .prom-thumbnail-input { min-height: 46px; padding: 12px 13px; font-size: 13px !important; }
.prom-thumbnail-input, .prom-thumbnail-select, .prom-thumbnail-textarea { width: 100%; background: var(--light-ui-surface, #080e12); border: 1px solid var(--light-ui-border, #2b353d); border-radius: 6px; color: var(--light-ui-text, #edf2f3); padding: 10px 11px; font-size: 12px !important; line-height: 1.5; }
.prom-thumbnail-input::placeholder, .prom-thumbnail-textarea::placeholder { color: var(--light-ui-muted, #738189); }
.prom-thumbnail-createDetails { border-top: 1px solid var(--studio-border); border-bottom: 1px solid var(--studio-border); }
.prom-thumbnail-createDetails summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 46px; color: var(--light-ui-text, #c1cbcf); font-size: 11px; cursor: pointer; list-style: none; }
.prom-thumbnail-createDetails summary::-webkit-details-marker { display: none; }
.prom-thumbnail-createDetails summary::after { content: '+'; color: var(--light-ui-muted, #89969c); font-size: 16px; line-height: 1; }
.prom-thumbnail-createDetails[open] summary::after { content: '−'; }
.prom-thumbnail-createDetails summary span { margin-left: auto; color: var(--light-ui-muted, #818e94); font-size: 9px; letter-spacing: .07em; text-transform: uppercase; }
.prom-thumbnail-createDetailsContent { padding: 3px 0 2px; }
.prom-thumbnail-createDetailsContent .prom-thumbnail-field:last-child { margin-bottom: 10px; }
.prom-thumbnail-textarea { resize: vertical; min-height: 82px; }
.prom-thumbnail-hint { font-size: 10px; color: var(--light-ui-muted, #8f9ca3); line-height: 1.6; margin: 6px 0 0; }
.prom-thumbnail-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.prom-thumbnail-chip { border: 1px solid var(--light-ui-border, #ffffff0d); background: var(--light-ui-surface, #ffffff05); color: var(--light-ui-muted, #a8b5ba); padding: 4px 7px; border-radius: 5px; font-size: 10px !important; }
.prom-thumbnail-chip[aria-pressed=true] { border-color: var(--light-ui-border, #7ff2d440); background: #7ff2d415; color: var(--studio-accent); }
.prom-thumbnail-hook { display: block; width: 100%; padding: 9px 10px; color: var(--light-ui-muted, #b7c5c9); background: var(--light-ui-surface, #ffffff03); border: 1px solid var(--studio-border); border-radius: 5px; font-size: 11px !important; text-align: left; margin-top: 5px; }
.prom-thumbnail-hook:hover { color: var(--studio-accent); border-color: var(--light-ui-border, #7ff2d430); }
.prom-thumbnail-backgroundRow { display: flex; gap: 8px; align-items: center; }
.prom-thumbnail-backgroundSwatch { width: 37px; height: 35px; border-radius: 5px; border: 1px solid #ffffff15; flex: none; }
.prom-thumbnail-palette { display: flex; align-items: center; gap: 9px; }
.prom-thumbnail-swatch { width: 28px; height: 28px; border-radius: 50%; border: 3px solid #101619; box-shadow: 0 0 0 1px transparent; flex: none; position: relative; display: grid; place-items: center; color: #0a151b; padding: 0; }
.prom-thumbnail-swatch[aria-pressed=true] { box-shadow: 0 0 0 1px #c4d5db; }
.prom-thumbnail-colorInput { width: 28px; height: 28px; padding: 0; border: 0; background: transparent; border-radius: 50%; cursor: pointer; }
.prom-thumbnail-colorInput::-webkit-color-swatch-wrapper { padding: 0; }
.prom-thumbnail-colorInput::-webkit-color-swatch { border: 2px solid #ffffff30; border-radius: 50%; }
.prom-thumbnail-upload { position: relative; display: flex; justify-content: center; align-items: center; flex-direction: column; gap: 5px; width: 100%; min-height: 70px; padding: 12px; text-align: center; border: 1px dashed var(--light-ui-border, #3a464e); border-radius: 6px; color: var(--light-ui-muted, #b5c2c9); background: var(--light-ui-surface, #080e1266); cursor: pointer; font-size: 11px; }
.prom-thumbnail-upload:hover, .prom-thumbnail-upload:focus-within { border-color: var(--studio-accent); background: #7ff2d404; }
.prom-thumbnail-upload small { color: var(--light-ui-muted, #8999a2); font-size: 10px; }
.prom-thumbnail-hiddenInput { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
.prom-thumbnail-referenceStrip { display: flex; gap: 8px; margin-top: 9px; }
.prom-thumbnail-reference { position: relative; width: 68px; height: 44px; }
.prom-thumbnail-reference img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.prom-thumbnail-reference button { position: absolute; right: -4px; top: -4px; width: 18px; height: 18px; border: 1px solid #4d5a60; background: #101619; color: #fff; border-radius: 50%; display: grid; place-items: center; }
.prom-thumbnail-qualityGroup { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.prom-thumbnail-quality { padding: 10px; text-align: left; background: var(--light-ui-surface, #080e12); color: var(--light-ui-text, #d1dade); border: 1px solid var(--light-ui-border, #29363e); border-radius: 6px; font-size: 11px !important; }
.prom-thumbnail-quality small { display: block; font-size: 9px; color: var(--light-ui-muted, #929fa5); margin-top: 3px; }
.prom-thumbnail-quality[aria-pressed=true] { border-color: var(--light-ui-accent, #7ff2d45c); background: #7ff2d407; }
.prom-thumbnail-range { width: 100%; accent-color: var(--studio-accent); }
.prom-thumbnail-footer { padding: 15px 22px 18px; border-top: 1px solid var(--studio-border); background: var(--light-ui-surface, #101619); flex: none; }
.prom-thumbnail-primary { width: 100%; min-height: 42px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--studio-accent); color: var(--light-ui-on-accent, #06251e); border: 1px solid var(--studio-accent); border-radius: 6px; font-size: 12px !important; font-weight: 650 !important; }
.prom-thumbnail-primary:hover { background: var(--light-ui-accent-hover, #a4f6df); }
.prom-thumbnail-secondary { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; padding: 8px 10px; background: var(--light-ui-surface, #ffffff04); border: 1px solid var(--light-ui-border, #ffffff1a); border-radius: 6px; color: var(--light-ui-text, #d4dfe2); font-size: 11px !important; }
.prom-thumbnail-secondary:hover { background: var(--light-ui-surface, #ffffff09); border-color: var(--light-ui-border, #ffffff30); }
.prom-thumbnail-exportRow { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 9px; }
.prom-thumbnail-error { margin: 0 0 10px; padding: 9px 10px; background: #f5737320; border: 1px solid var(--light-ui-danger-border, #f5737340); color: var(--light-ui-danger, #ffbdbd); border-radius: 5px; font-size: 11px; line-height: 1.5; }
.prom-thumbnail-success { margin: 0 0 10px; color: var(--light-ui-success, #a2e6cb); font-size: 11px; display: flex; align-items: center; gap: 6px; }
.prom-thumbnail-footerHint { margin: 7px 0 0; font-size: 10px; color: var(--light-ui-muted, #94a2aa); text-align: center; line-height: 1.5; }
@media(min-width:1600px) { .prom-thumbnail-body { grid-template-columns: minmax(0,1fr) 410px; } .prom-thumbnail-stageImage { max-height: 510px; } }
@media(max-width:1100px) { .prom-thumbnail-body { grid-template-columns: minmax(0,1fr) 340px; } .prom-thumbnail-canvasColumn { padding: 18px; } .prom-thumbnail-panel { padding: 18px; } .prom-thumbnail-footer { padding: 14px 18px; } }
@media(max-width:800px) { .prom-thumbnail-studio { padding: 8px; } .prom-thumbnail-window { height: 97dvh; border-radius: 10px; } .prom-thumbnail-body { grid-template-columns: 1fr; overflow-y: auto; display: block; } .prom-thumbnail-canvasColumn { overflow: visible; padding: 16px; } .prom-thumbnail-canvasToolbar { align-items: flex-start; } .prom-thumbnail-aspectGroup { flex-wrap: wrap; } .prom-thumbnail-stage { min-height: clamp(320px,76vw,520px); } .prom-thumbnail-stage[data-ratio="9:16"], .prom-thumbnail-stage[data-ratio="2:3"] { min-height: clamp(420px,102vw,650px); } .prom-thumbnail-stage[data-ratio="1:1"] { min-height: clamp(360px,88vw,560px); } .prom-thumbnail-inspector { border-left: 0; border-top: 1px solid var(--studio-border); min-height: 560px; } .prom-thumbnail-panel { overflow: visible; } .prom-thumbnail-footer { position: sticky; bottom: 0; z-index: 2; box-shadow: var(--light-ui-panel-shadow, 0 -10px 25px #0004); } .prom-thumbnail-header { padding: 12px 16px; min-height: 68px; } .prom-thumbnail-status { display: none; } .prom-thumbnail-title { font-size: 18px; } .prom-thumbnail-project { max-width: 195px; } .prom-thumbnail-previewMeta { margin-bottom: 18px; flex-wrap: wrap; } .prom-thumbnail-referenceTile { flex-basis: 178px; } .prom-thumbnail-referenceFilters { grid-template-columns: 1fr; } .prom-thumbnail-referenceBrowseGrid { grid-template-columns: repeat(2,minmax(0,1fr)); max-height: 58vh; } }
@media(prefers-reduced-motion:reduce) { .prom-thumbnail-window *, .prom-thumbnail-window *::before, .prom-thumbnail-window *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }

/* Chat / Assistant Tab Styles */
.prom-thumbnail-chatContainer { display: flex; flex-direction: column; gap: 14px; min-height: 100%; }
.prom-thumbnail-chatContextCard { display: flex; gap: 10px; padding: 10px 12px; background: #070d10; border: 1px solid #1c272e; border-radius: 8px; align-items: center; }
.prom-thumbnail-chatContextThumb { width: 52px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid #ffffff18; flex: none; }
.prom-thumbnail-chatContextInfo { min-width: 0; flex: 1; }
.prom-thumbnail-chatContextTitle { font-size: 11px; font-weight: 600; color: #dbeef3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
.prom-thumbnail-chatContextSubtitle { font-size: 10px; color: #7f9199; margin: 2px 0 0; }
.prom-thumbnail-chatMessageList { display: flex; flex-direction: column; gap: 10px; max-height: 280px; overflow-y: auto; padding: 4px; scrollbar-width: thin; scrollbar-color: #344047 transparent; }
.prom-thumbnail-chatBubble { padding: 9px 12px; border-radius: 8px; font-size: 11px; line-height: 1.55; max-width: 90%; }
.prom-thumbnail-chatBubbleUser { align-self: flex-end; background: #1a2a32; color: #eaf2f5; border: 1px solid #2e4450; border-bottom-right-radius: 2px; }
.prom-thumbnail-chatBubbleAssistant { align-self: flex-start; background: #0c1418; color: #a5b7be; border: 1px solid #1c272e; border-bottom-left-radius: 2px; }
.prom-thumbnail-chatBubbleSender { display: flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 650; color: var(--studio-accent); margin-bottom: 3px; text-transform: uppercase; letter-spacing: .06em; }
.prom-thumbnail-chatPromptChips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
.prom-thumbnail-chatPromptChip { border: 1px solid #233139; background: #081014; color: #9bb0b8; padding: 5px 8px; border-radius: 5px; font-size: 10px; text-align: left; transition: all .16s; }
.prom-thumbnail-chatPromptChip:hover { border-color: var(--studio-accent); color: #e0f6ef; background: #7ff2d40d; }
.prom-thumbnail-chatInputBox { display: flex; flex-direction: column; gap: 8px; background: #080e12; border: 1px solid #25333b; border-radius: 8px; padding: 8px 10px; }
.prom-thumbnail-chatInputBox:focus-within { border-color: var(--studio-accent); }
.prom-thumbnail-chatTextarea { width: 100%; background: transparent; border: 0; color: #edf2f3; font-size: 11px; line-height: 1.5; resize: none; min-height: 52px; outline: none; }
.prom-thumbnail-chatTextarea::placeholder { color: #697880; }
.prom-thumbnail-chatInputFooter { display: flex; justify-content: space-between; align-items: center; gap: 8px; border-top: 1px solid #182329; padding-top: 6px; }
.prom-thumbnail-chatSendBtn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: var(--studio-accent); color: #07251e; font-size: 11px; font-weight: 600; border: 0; border-radius: 5px; }
.prom-thumbnail-chatSendBtn:hover:not(:disabled) { background: #9bf8e0; }
.prom-thumbnail-chatSendBtn:disabled { opacity: .45; }
.prom-thumbnail-chatRefineBadge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; font-size: 10px; color: var(--studio-accent); background: #7ff2d412; border: 1px solid #7ff2d42e; border-radius: 12px; }
.prom-thumbnail-refineChatButton { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; font-size: 10px; color: var(--studio-accent); background: #7ff2d410; border: 1px solid #7ff2d433; border-radius: 5px; font-weight: 550; }
.prom-thumbnail-refineChatButton:hover { background: #7ff2d41f; border-color: var(--studio-accent); }

/* Keep the chosen frame and its alternatives visible together on desktop. */
.prom-thumbnail-previewSourceLayout { display: grid; grid-template-columns: minmax(0,1.65fr) minmax(235px,.85fr); gap: 14px; align-items: stretch; }
.prom-thumbnail-previewColumn { display: flex; flex-direction: column; min-width: 0; }
.prom-thumbnail-previewSourceLayout .prom-thumbnail-stage,
.prom-thumbnail-previewSourceLayout .prom-thumbnail-stage[data-ratio="9:16"],
.prom-thumbnail-previewSourceLayout .prom-thumbnail-stage[data-ratio="2:3"],
.prom-thumbnail-previewSourceLayout .prom-thumbnail-stage[data-ratio="1:1"] { height: clamp(210px,30vh,340px); min-height: 210px; }
.prom-thumbnail-previewColumn .prom-thumbnail-previewMeta { margin: 8px 0 0; }
.prom-thumbnail-sourceFramesPanel { min-width: 0; min-height: 0; padding: 10px; border: 1px solid var(--studio-border); border-radius: 8px; background: var(--light-ui-surface, #101619); }
.prom-thumbnail-sourceFramesPanel .prom-thumbnail-sectionHeading { gap: 8px; margin-bottom: 8px; }
.prom-thumbnail-sourceFramesPanel .prom-thumbnail-sectionHeading h2 { font-size: 11px; }
.prom-thumbnail-sourceFramesPanel .prom-thumbnail-count { margin-left: 5px; }
.prom-thumbnail-sourceFramesPanel .prom-thumbnail-sectionActions { gap: 4px; }
.prom-thumbnail-sourceFramesPanel .prom-thumbnail-textButton { font-size: 10px !important; white-space: nowrap; }
.prom-thumbnail-sourceFramesPanel .prom-thumbnail-frameStrip { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); align-content: start; gap: 7px; max-height: clamp(190px,30vh,270px); overflow-x: hidden; overflow-y: auto; padding: 2px 3px 8px; }
.prom-thumbnail-sourceFramesPanel .prom-thumbnail-frame,
.prom-thumbnail-sourceFramesPanel .prom-thumbnail-skeleton { width: 100%; min-width: 0; height: auto; aspect-ratio: 16 / 10; flex: none; }
.prom-thumbnail-templates { margin-top: 12px; }
@media(max-width:800px) {
  .prom-thumbnail-previewSourceLayout { grid-template-columns: minmax(0,1fr); gap: 10px; }
  .prom-thumbnail-previewSourceLayout .prom-thumbnail-stage,
  .prom-thumbnail-previewSourceLayout .prom-thumbnail-stage[data-ratio="9:16"],
  .prom-thumbnail-previewSourceLayout .prom-thumbnail-stage[data-ratio="2:3"],
  .prom-thumbnail-previewSourceLayout .prom-thumbnail-stage[data-ratio="1:1"] { height: auto; min-height: clamp(280px,64vw,420px); }
  .prom-thumbnail-sourceFramesPanel { padding: 0; border: 0; background: transparent; }
  .prom-thumbnail-sourceFramesPanel .prom-thumbnail-frameStrip { display: flex; max-height: none; overflow-x: auto; overflow-y: hidden; }
}
@media(max-width:520px) {
  .prom-thumbnail-sourceFramesPanel .prom-thumbnail-sectionHeading { align-items: flex-start; flex-wrap: wrap; }
  .prom-thumbnail-sourceFramesPanel .prom-thumbnail-sectionActions { margin-left: auto; }
}

`
