/**
 * Startup verification script.
 * Verifies that the app module can be imported and basic initialization works.
 * Used for CI smoke testing without a full TUI runtime.
 */

const start = performance.now();

// Verify core modules import successfully
await import("../src/config/app-config");
await import("../src/store/app-store");
await import("../src/core/session-manager");
await import("../src/tools/registry");
await import("../src/core/providers/provider-registry");
await import("../src/core/context-manager");
await import("../src/core/cross-tool/universal-loader");

const elapsed = performance.now() - start;

console.log(`Core module import: ${elapsed.toFixed(1)}ms`);
console.log(`Status: ${elapsed < 500 ? "PASS" : "SLOW"} (target: <500ms for imports)`);

// Verify store initializes
const { useAppStore } = await import("../src/store/app-store");
const state = useAppStore.getState();
console.log(`Store initialized: sessions=${Object.keys(state.sessions).length}`);

// Verify config loads
const { loadAppConfig } = await import("../src/config/app-config");
const config = await loadAppConfig();
console.log(`Config loaded: leader=${config.keybinds.leader}`);

// Verify provider registry
const { createDefaultProviderRegistry } = await import("../src/core/providers/provider-registry");
const registry = createDefaultProviderRegistry();
console.log(`Providers registered: ${registry.list().length}`);

const total = performance.now() - start;
console.log(`\nTotal verification: ${total.toFixed(1)}ms`);
console.log(`Result: ${total < 1000 ? "✅ PASS" : "⚠️ SLOW"}`);

process.exit(0);
