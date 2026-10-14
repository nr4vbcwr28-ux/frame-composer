---
name: PWA manifest source
description: Where to define Frame Composer's install metadata and icons.
---

For Frame Composer, define app manifest fields in the `VitePWA` `manifest` config rather than `public/manifest.webmanifest`. The plugin generates and injects its manifest, and can replace a same-path public file with defaults when its manifest option is omitted.

**Why:** A production build unexpectedly contained the plugin's default app name, colors, and no icons when a static manifest was present but the plugin manifest option was omitted.

**How to apply:** When changing the PWA name, display mode, theme, or icons, update the plugin manifest and verify the built manifest in `dist`.
