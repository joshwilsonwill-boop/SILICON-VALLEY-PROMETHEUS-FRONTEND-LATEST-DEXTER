# Gates: Shared UI performance

OWNS: app/layout.tsx, components/root-client-effects.tsx, components/navigation/jarvis-top-nav-filament.tsx

Scope: Reduce always-on work and initial client code from the shared app shell while preserving voice companion access.

- [x] G1: The voice companion is loaded after deferred enhancements become ready, rather than being part of the root layout's eager component imports.
  EVIDENCE: Manually inspected the root layout and RootClientEffects; the root layout no longer imports the voice companion and RootClientEffects dynamically imports it only after enhancementsReady.

- [x] G2: The voice filament schedules no animation frames while idle or when reduced motion is enabled, and caps active animation at 30 frames per second.
  EVIDENCE: Manually inspected the shouldAnimateFilament guard, reduced motion condition, static idle path, and 30 fps draw interval in JarvisTopNavFilament.
