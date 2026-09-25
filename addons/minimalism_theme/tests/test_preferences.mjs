// Run with Node 18+; no npm dependencies.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../static/src/js/preferences.js", import.meta.url), "utf8");
const preferencesURL = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { DEFAULTS, ACCENT_PRESETS, normalizeThemeSettings, accentTextColor, normalizePreferences,
    storageKey, readPreferences, writePreferences, applyPreferences, resolveColorScheme } = await import(preferencesURL);
const values = new Map();
const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
const blocked = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceededError"); } };
const key = storageKey("erp-production", 7);
assert.notEqual(key, storageKey("erp-test", 7), "databases must not share settings");
assert.notEqual(key, storageKey("erp-production", 8), "users must not share settings");
assert.notEqual(storageKey("a:b", 7), storageKey("a", "b:7"), "keys must not collide");
assert.deepEqual(readPreferences(storage, key), DEFAULTS);
assert.deepEqual(readPreferences(blocked, key), DEFAULTS);
assert.deepEqual(readPreferences(null, key), DEFAULTS);
assert.equal(writePreferences(blocked, key, DEFAULTS), false);
values.set(key, "broken-json");
assert.deepEqual(readPreferences(storage, key), DEFAULTS);
assert.deepEqual(normalizePreferences({ enabled: "false", palette: "pink", mode: "invalid", density: "massive" }), DEFAULTS);
assert.deepEqual(normalizePreferences({ enabled: true, palette: "mint", density: "compact" }),
    { enabled: true, mode: "auto", density: "compact" }, "legacy palettes are ignored while personal spacing survives");
const compact = { enabled: false, mode: "dark", density: "compact" };
assert.equal(writePreferences(storage, key, compact), true);
assert.deepEqual(readPreferences(storage, key), compact);
assert.deepEqual(readPreferences(storage, storageKey("erp-production", 8)), DEFAULTS);
const classes = new Set(["o_web_client", "o_rtl"]);
const styles = new Map([["--unrelated", "keep"]]);
const root = {
    dataset: { unrelated: "keep", minPalette: "pink" },
    style: { setProperty: (key, value) => styles.set(key, value), removeProperty: (key) => styles.delete(key) },
    classList: { toggle(name, on) { on ? classes.add(name) : classes.delete(name); } },
};
applyPreferences(root, DEFAULTS, "dark");
assert.equal(root.dataset.minMode, "dark");
assert.equal(root.dataset.minPalette, undefined, "legacy palette attributes are removed");
assert.equal(resolveColorScheme("light", "dark"), "light", "explicit personal mode wins over Odoo's bundle");
assert.equal(resolveColorScheme("dark", "light"), "dark");
assert.deepEqual(normalizeThemeSettings(null), { accent_preset: "blue" });
for (const invalid of ["#1122aa", "url(evil)", "constructor", "__proto__", ["blue"], null]) {
    assert.deepEqual(normalizeThemeSettings({ accent_preset: invalid }), { accent_preset: "blue" });
}
const settings = normalizeThemeSettings({ accent_preset: "blue", custom_colors: true, night_mode: true,
    colors: { accent: "#1122aa", dark_surface: "#ffffff" } });
assert.deepEqual(settings, { accent_preset: "blue" }, "retired free-form colors/global mode are ignored");
assert.equal(accentTextColor("#ffffff"), "#000000");
assert.equal(accentTextColor("#000000"), "#ffffff");

// Contrast calculations are independent of the theme's label/tint implementation.
function luminance(hex) {
    const channels = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
        .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return channels.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function contrast(a, b) {
    const [bright, dark] = [luminance(a), luminance(b)].sort((a, b) => b - a);
    return (bright + 0.05) / (dark + 0.05);
}
assert.deepEqual(Object.keys(ACCENT_PRESETS), ["yellow", "blue", "green", "purple", "pink", "orange", "red"]);
for (const [preset, accent] of Object.entries(ACCENT_PRESETS)) {
    for (const mode of ["light", "dark"]) {
        styles.set("--min-surface", "#ff0000");
        applyPreferences(root, { ...DEFAULTS, mode, palette: "pink" }, "light", { accent_preset: preset });
        assert.equal(root.dataset.minMode, mode);
        assert.equal(styles.get("--min-accent"), accent);
        assert.ok(contrast(styles.get("--min-accent-ink"), accent) >= 4.5, `${preset} button/nav text contrast`);
        const ink = mode === "dark" ? "#fafafa" : "#18181b";
        assert.ok(contrast(ink, styles.get("--min-accent-soft")) >= 4.5, `${preset}/${mode} highlighted text contrast`);
        assert.deepEqual([...styles.keys()].sort(), ["--min-accent", "--min-accent-ink", "--min-accent-soft", "--unrelated"],
            "preset must not override neutral, semantic or focus colors; old free-form overrides must be removed");
    }
}
applyPreferences(root, compact, "light", settings);
assert.deepEqual([...classes], ["o_web_client", "o_rtl"], "no setting forces the theme on");
assert.deepEqual(root.dataset, { unrelated: "keep" });
assert.deepEqual([...styles], [["--unrelated", "keep"]]);

// Exercise the actual service's toggle and storage-event behavior with Odoo boundaries stubbed.
const listeners = {};
globalThis.window = { localStorage: storage, addEventListener: (name, handler) => { listeners[name] = handler; } };
globalThis.document = { body: root, querySelector: () => null };
const serviceSource = (await readFile(new URL("../static/src/js/theme_service.js", import.meta.url), "utf8"))
    .replace('import { getBundle } from "@web/core/assets";', 'const getBundle = () => {};')
    .replace('import { _t } from "@web/core/l10n/translation";', 'const _t = value => value;')
    .replace('import { StylesheetSwitcher } from "./stylesheet_switcher";', `class StylesheetSwitcher {
        target(enabled, mode) { return enabled ? mode : null; }
        async prepare() { await globalThis.prepareStyles?.(); }
        activate() {}
    }`)
    .replace('import { reactive } from "@odoo/owl";', 'const reactive = value => value;')
    .replace('import { registry } from "@web/core/registry";', 'const registry = { category: () => ({ add() {} }) };')
    .replace('import { user } from "@web/core/user";', 'const user = { userId: 7 };')
    .replace('import { session } from "@web/session";', 'const session = { db: "erp-production" };')
    .replace('from "./preferences";', `from "${preferencesURL}";`);
const { minThemeService } = await import(`data:text/javascript;base64,${Buffer.from(serviceSource).toString("base64")}`);
const env = { bus: { trigger() {} } };
const notices = [];
const deps = { notification: { add: text => notices.push(text) } };
const service = await minThemeService.start(env, deps);
assert.equal(classes.has("o_min_theme"), false);
await service.toggleMode();
assert.equal(root.dataset.minMode, "dark");
assert.equal(service.state.enabled, true, "a user can opt back in with the top-bar toggle");
assert.equal(readPreferences(storage, key).mode, "dark", "night mode survives reload");
assert.deepEqual(readPreferences(storage, storageKey("erp-production", 8)), DEFAULTS, "toggling must not affect another user");
await service.toggleMode();
assert.equal(root.dataset.minMode, "light");
writePreferences(storage, key, { ...DEFAULTS, mode: "dark" });
listeners.storage({ storageArea: storage, key: storageKey("erp-production", 8) });
assert.equal(root.dataset.minMode, "light", "another user's storage event is ignored");
listeners.storage({ storageArea: storage, key });
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(root.dataset.minMode, "dark", "same-user tabs synchronize");
await service.reset();
assert.equal(root.dataset.minMode, "light");
// Failed loads must preserve state, stored preference and the current appearance.
globalThis.prepareStyles = () => Promise.reject(new Error("Network failure"));
await service.toggleMode();
assert.equal(root.dataset.minMode, "light");
assert.equal(readPreferences(storage, key).mode, "auto");
assert.equal(service.status.loading, false);
assert.equal(notices.length, 1);
// The latest selection wins even when earlier styles finish loading later.
let finish;
globalThis.prepareStyles = () => new Promise(resolve => { finish = resolve; });
const slow = service.set({ mode: "dark" });
const finishSlow = finish;
globalThis.prepareStyles = undefined;
await service.set({ mode: "light", density: "compact" });
finishSlow();
await slow;
assert.equal(root.dataset.minMode, "light");
assert.equal(service.state.density, "compact");
assert.equal(service.status.loading, false);
window.localStorage = blocked;
const unreadableStorageService = await minThemeService.start(env, deps);
assert.equal(unreadableStorageService.status.persistent, false, "blocked reads are disclosed before the first change");
Object.defineProperty(window, "localStorage", { get() { throw new Error("SecurityError"); } });
const privateService = await minThemeService.start(env, deps);
await privateService.toggleMode();
assert.equal(root.dataset.minMode, "dark", "blocked storage must not prevent toggling");
assert.equal(privateService.status.persistent, false);
console.log("PASS: personal mode toggling, reload persistence, user/tab isolation, storage failures, seven presets, day/night contrast, admin color precedence and legacy-setting cleanup");
