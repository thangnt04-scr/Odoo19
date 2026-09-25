/** @odoo-module **/
// SPDX-License-Identifier: LGPL-3.0-or-later

export const DEFAULTS = Object.freeze({ enabled: true, mode: "auto", density: "comfortable" });
export const ACCENT_PRESETS = Object.freeze({
    yellow: "#eab308",
    blue: "#2563eb",
    green: "#15803d",
    purple: "#7c3aed",
    pink: "#db2777",
    orange: "#c2410c",
    red: "#dc2626",
});
// Remove old free-form overrides too when a page updates to preset-only colors.
const CUSTOM_PROPERTIES = [
    "accent", "accent-soft", "accent-ink", "bg", "surface", "subtle",
    "ink", "muted", "border", "line", "link",
];

export function normalizeThemeSettings(value) {
    const input = value && typeof value === "object" ? value : {};
    return {
        accent_preset: typeof input.accent_preset === "string" && Object.hasOwn(ACCENT_PRESETS, input.accent_preset)
            ? input.accent_preset : "blue",
    };
}

function rgb(color) {
    return [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
}

function mix(first, second, weight) {
    const other = rgb(second);
    return `#${rgb(first).map((channel, index) =>
        Math.round(channel * weight + other[index] * (1 - weight)).toString(16).padStart(2, "0")
    ).join("")}`;
}

export function accentTextColor(color) {
    const linear = rgb(color).map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    return luminance > 0.179 ? "#000000" : "#ffffff";
}

export function normalizePreferences(value) {
    const input = value && typeof value === "object" ? value : {};
    return {
        enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULTS.enabled,
        mode: ["auto", "light", "dark"].includes(input.mode) ? input.mode : DEFAULTS.mode,
        density: ["comfortable", "compact"].includes(input.density) ? input.density : DEFAULTS.density,
    };
}

export function resolveColorScheme(mode, fallback = "light") {
    return ["light", "dark"].includes(mode) ? mode : fallback === "dark" ? "dark" : "light";
}

export function storageKey(database, userId) {
    // Origin-scoped storage plus explicit database/user isolation on shared devices.
    return `minimalism_theme.v1:${encodeURIComponent(database || "")}:${userId || 0}`;
}

export function readPreferences(storage, key) {
    try {
        return normalizePreferences(JSON.parse(storage.getItem(key)));
    } catch {
        // Corrupt settings / disabled browser storage must never prevent Odoo booting.
        return { ...DEFAULTS };
    }
}

export function writePreferences(storage, key, value) {
    try {
        storage.setItem(key, JSON.stringify(normalizePreferences(value)));
        return true;
    } catch {
        return false;
    }
}

export function applyPreferences(root, value, colorScheme = "light", settings = {}) {
    const prefs = normalizePreferences(value);
    const policy = normalizeThemeSettings(settings);
    const enabled = prefs.enabled;
    const mode = resolveColorScheme(prefs.mode, colorScheme);
    // Old browser palettes no longer override administrator-managed colors.
    delete root.dataset.minPalette;
    // Always clean up previously applied colors, including when disabling/resetting.
    for (const property of CUSTOM_PROPERTIES) {
        root.style.removeProperty(`--min-${property}`);
    }
    root.classList.toggle("o_min_theme", enabled);
    if (enabled) {
        root.dataset.minDensity = prefs.density;
        root.dataset.minMode = mode;
        const accent = ACCENT_PRESETS[policy.accent_preset];
        // Accent choices never overwrite surfaces, body text, focus or semantic colors.
        const properties = {
            accent,
            "accent-ink": accentTextColor(accent),
            "accent-soft": mix(accent, mode === "dark" ? "#18181b" : "#ffffff", 0.15),
        };
        for (const [name, color] of Object.entries(properties)) {
            root.style.setProperty(`--min-${name}`, color);
        }
    } else {
        delete root.dataset.minPalette;
        delete root.dataset.minDensity;
        delete root.dataset.minMode;
    }
}
