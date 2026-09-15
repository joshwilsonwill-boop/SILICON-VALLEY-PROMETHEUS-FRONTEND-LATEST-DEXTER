---
name: critique
description: Self-critique loop for frontend output quality. Forces the agent to evaluate its own generated code, UI decisions, and architectural choices against a strict bar of professional quality before finalising. Use when implementing UI components, animations, autonomous workflows, or any output where "good enough" isn't acceptable. Triggers: "critique this", "self-review", "hold yourself to a higher bar", "loop through your output", "quality check before shipping".
---

# Critique Skill — Prometheus Frontend

## Purpose
Before finalising **any** frontend output — component, plan, animation, integration — run it through this loop. The loop is mandatory, not optional. Mediocre output that passes a cursory read but fails real-world standards gets caught here.

## The Critique Loop

Run each gate in order. If ANY gate fails, **revise first, ship second**.

### Gate 1 — Does It Actually Work End-to-End?
- [ ] Can a real user trigger this feature from the UI without manual console calls?
- [ ] Does it read from real data (not hardcoded stubs / `—` placeholders)?
- [ ] Are all event listeners wired to something that actually dispatches them?
- [ ] Do all callbacks reach their intended state updater?

### Gate 2 — Animation & Motion Quality Bar
- [ ] Are animations GSAP or Framer Motion — not raw CSS `transition` where richness matters?
- [ ] Is GSAP **actually imported and used**, not just listed in `package.json`?
- [ ] Do transitions use easing curves (`ease: [0.22, 1, 0.36, 1]`) — not linear?
- [ ] Is the ghost cursor using `spring` physics with `stiffness ≥ 700`, `damping ≤ 40`?
- [ ] Does every interactive element have a micro-interaction (hover scale, glow, ripple)?
- [ ] Are animations accessible (respects `prefers-reduced-motion`)?

### Gate 3 — Data Completeness
- [ ] Is the data schema fully defined (Zod or TypeScript interface)?
- [ ] Are all schema fields actually populated at runtime — no silent empty arrays?
- [ ] If a component renders nothing, is there a clear loading / empty state visible to the user?

### Gate 4 — DOM Targeting & Autonomous Wiring
- [ ] Are `data-*` semantic attributes present on every autonomous target element?
- [ ] Does the coordinator have a method for **every** declared `AutonomousActionKind`?
- [ ] Does the chat pipeline dispatch the correct `window` `CustomEvent` for each action?
- [ ] Is there exactly ONE `AgenticCursorLayer` mounted in the tree?

### Gate 5 — UI Calibre
- [ ] Does this look like it belongs in a $50k/year SaaS — not a Shadcn template?
- [ ] Does every panel show real, live data vs static mocks?
- [ ] Are buttons, handles, and interactive regions obviously affordance-rich?
- [ ] Is the typography hierarchy intentional (size contrast ≥ 1.4×, weight contrast clear)?

### Gate 6 — No Regressions
- [ ] Does the change break any other component that imports the modified file?
- [ ] Are all TypeScript types consistent — no `any` added to silence errors?
- [ ] Does the modified file still compile without errors?

## Self-Critique Response Format

When critiquing your own output, structure the response as:

```
## Critique Pass

### ✅ Passed Gates
- Gate N: [reason]

### ❌ Failed Gates  
- Gate N: [specific failure] → Revision required: [what to fix]

### Revised Output
[corrected code/plan]
```

## When to Use

- After writing any component > 50 lines
- After any autonomous UI integration
- After any animation implementation
- Before filing a GitHub issue / plan as "done"
- Any time the user says "are you sure that's right?"
