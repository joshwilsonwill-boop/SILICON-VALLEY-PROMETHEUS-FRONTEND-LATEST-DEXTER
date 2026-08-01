# Elegist Chat Greeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved measured Elegist greeting in desktop and mobile chat without ever rendering the base UI font in its visible heading layer.

**Architecture:** A shared client component owns line composition, stable layout reservation, accessibility, and browser font readiness. The existing desktop and mobile chat views become thin call sites, while the root local-font declaration disables generated font adjustment and fallback families.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Next local fonts, Framer Motion, Node assertion tests

---

### Task 1: Lock The Contract With A Failing Regression Test

**Files:**
- Modify: `tests/elegist-font-loading.test.mjs`
- Test: `tests/elegist-font-loading.test.mjs`

- [ ] **Step 1: Add assertions for the strict font and shared component**

Read `app/layout.tsx`, `components/editor/PrometheusChat.tsx`, `components/editor/prometheus-chat-mobile.tsx`, and the new component source. Assert that:

```js
const greeting = read('components/editor/elegist-chat-greeting.tsx')

assert.match(layout, /adjustFontFallback:\s*false/)
assert.match(layout, /fallback:\s*\[\]/)
assert.match(greeting, /document\.fonts\.load/)
assert.match(greeting, /document\.fonts\.check/)
assert.match(greeting, /font-elegist/)
assert.match(greeting, /CinematicTextReveal/)
assert.match(greeting, /What would you like\\n/)
assert.match(desktopChat, /<ElegistChatGreeting/)
assert.match(mobileChat, /<ElegistChatGreeting/)
assert.doesNotMatch(desktopChat, /function EmptyChatGreeting/)
```

- [ ] **Step 2: Run the test and confirm it fails for the missing implementation**

Run: `node tests/elegist-font-loading.test.mjs`  
Expected: FAIL because `components/editor/elegist-chat-greeting.tsx` does not exist or the new contract assertions do not match.

### Task 2: Build The Shared Font-Gated Greeting

**Files:**
- Create: `components/editor/elegist-chat-greeting.tsx`
- Modify: `app/layout.tsx`
- Test: `tests/elegist-font-loading.test.mjs`

- [ ] **Step 1: Add the shared client component**

Create a component with this public contract:

```ts
export type ElegistChatGreetingProps = {
  greeting: string
  className?: string
}

export function ElegistChatGreeting({
  greeting,
  className,
}: ElegistChatGreetingProps) {
  // Render an invisible, aria-hidden Elegist probe to reserve final layout.
  // Resolve the primary generated font family from computed styles.
  // Use document.fonts.load/check before mounting the visible reveal.
  // Keep an sr-only h1 available while the visible layer is withheld.
}
```

The displayed sentence is formatted with:

```ts
const measuredGreeting = greeting.replace(
  /^What would you like\s+/,
  'What would you like\n',
)
```

The primary family is the first value returned by `getComputedStyle(probe).fontFamily`; only that family is passed to `document.fonts.load` and `document.fonts.check`. A rejected or false load leaves the visible heading withheld. Browsers without the Font Loading API reveal the preloaded face normally.

- [ ] **Step 2: Tighten the local-font declaration**

Extend the existing `elegistDisplay` options without changing its source, variable, preload, or block-display behavior:

```ts
const elegistDisplay = localFont({
  src: '../elegist/Elegist.otf',
  variable: '--font-elegist',
  display: 'block',
  preload: true,
  adjustFontFallback: false,
  fallback: [],
})
```

- [ ] **Step 3: Run the focused test**

Run: `node tests/elegist-font-loading.test.mjs`  
Expected: the font declaration and shared-component assertions pass; desktop/mobile integration assertions still fail until Task 3.

### Task 3: Integrate Direction A In Both Chat Surfaces

**Files:**
- Modify: `components/editor/PrometheusChat.tsx`
- Modify: `components/editor/prometheus-chat-mobile.tsx`
- Test: `tests/elegist-font-loading.test.mjs`

- [ ] **Step 1: Replace the desktop empty-state helper**

Import `ElegistChatGreeting` and render it inside the existing centered empty-state container:

```tsx
<ElegistChatGreeting
  greeting={getChatGreeting(session?.user, profile)}
  className="max-w-[52rem] text-balance text-[clamp(2.4rem,4.8vw,5.2rem)] font-normal leading-[0.9] tracking-normal text-white/92 [overflow-wrap:anywhere]"
/>
```

Remove the local `EmptyChatGreeting` function and its direct `CinematicTextReveal` import. Do not change thread, history, suggestions, composer, or scrolling logic.

- [ ] **Step 2: Replace the mobile empty-state heading**

Import the shared component and render:

```tsx
<ElegistChatGreeting
  greeting={getChatGreeting(session?.user, profile)}
  className="max-w-xl text-balance text-[clamp(2.5rem,10.5vw,4.35rem)] font-normal leading-[0.94] tracking-normal text-white/92 [overflow-wrap:anywhere]"
/>
```

Keep the existing sheet, close controls, composer, suggestions, and chat-history behavior unchanged.

- [ ] **Step 3: Run the focused regression test**

Run: `node tests/elegist-font-loading.test.mjs`  
Expected: PASS.

### Task 4: Verify The Complete Change

**Files:**
- Verify: `app/layout.tsx`
- Verify: `components/editor/elegist-chat-greeting.tsx`
- Verify: `components/editor/PrometheusChat.tsx`
- Verify: `components/editor/prometheus-chat-mobile.tsx`
- Verify: `tests/elegist-font-loading.test.mjs`

- [ ] **Step 1: Run static and production checks**

Run: `npm run typecheck`  
Expected: PASS.

Run: `npm run lint`  
Expected: PASS, or report only isolated pre-existing findings.

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 2: Inspect desktop and mobile in the running app**

At desktop and mobile widths, verify the empty chat state is centered, uses the measured two-line composition, stays inside the viewport with a long username, and remains static under reduced motion. In browser computed styles, confirm the visible heading's primary family is the generated Elegist face.

- [ ] **Step 3: Review the final diff**

Confirm no API contract, auth/profile flow, chat behavior, base palette, dependency, or unrelated user-owned change was altered. Report any existing dirty-worktree overlap instead of committing it accidentally.
