// Single source of truth for DSH Desktop feature toggles shared between the
// main process and the preload. These are plain constants (no Electron import)
// so both bundles can import them without pulling in native modules.
//
// ENABLE_MOBILE_BRIDGE — the "Connect Phone" (LAN mobile bridge) capability
// added 2026-08-17. Disabled at the user's request: the native menu entry, the
// preload-injected sidebar button, and the IPC handlers all no-op, and the
// bridge is never started. Flip to true to re-enable everything.
export const ENABLE_MOBILE_BRIDGE = false
