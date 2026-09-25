/** @odoo-module **/
// SPDX-License-Identifier: LGPL-3.0-or-later

import { reactive } from "@odoo/owl";
import { getBundle } from "@web/core/assets";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { session } from "@web/session";
import {
    DEFAULTS, applyPreferences, normalizePreferences, normalizeThemeSettings,
    readPreferences, resolveColorScheme, storageKey, writePreferences,
} from "./preferences";
import { StylesheetSwitcher } from "./stylesheet_switcher";

export const minThemeService = {
    dependencies: ["notification"],
    async start(env, { notification }) {
        const key = storageKey(session.db, user.userId);
        let storage;
        try {
            storage = window.localStorage;
            // Some privacy modes expose the object but reject even reads.
            storage.getItem(key);
        } catch {
            // Browsers can throw even when reading the localStorage property.
            storage = null;
        }
        const saved = readPreferences(storage, key);
        const state = reactive({ ...DEFAULTS, enabled: false });
        const status = reactive({ persistent: Boolean(storage), loading: false });
        const settings = normalizeThemeSettings(session.minimalism_theme);
        // Follow Odoo until this user explicitly chooses day or night mode.
        const colorScheme = document.querySelector('link[href*="web.assets_web_dark"]')
            ? "dark" : "light";
        const styles = new StylesheetSwitcher(document, getBundle, colorScheme);
        let revision = 0;
        let desired = saved;
        const apply = async (next, persist) => {
            const request = ++revision;
            desired = next;
            status.loading = true;
            try {
                const target = styles.target(next.enabled, resolveColorScheme(next.mode, colorScheme));
                const links = await styles.prepare(target);
                if (request !== revision) return;
                styles.activate(target, links);
                Object.assign(state, next);
                applyPreferences(document.body, state, colorScheme, settings);
                if (persist) status.persistent = writePreferences(storage, key, state);
                env.bus.trigger("MIN:APPEARANCE_CHANGED");
            } catch {
                if (request !== revision) return;
                desired = { ...state };
                notification.add(_t("Could not load the appearance styles. Your previous appearance is unchanged. Please try again."), { type: "warning" });
            } finally {
                if (request === revision) status.loading = false;
            }
        };
        await apply(saved, false);

        // Services live for the web client's lifetime, so one listener per client.
        window.addEventListener("storage", (event) => {
            if (event.storageArea === storage && (event.key === key || event.key === null)) {
                apply(readPreferences(storage, key), false);
            }
        });

        return {
            state,
            status,
            settings,
            colorScheme,
            set(patch) {
                return apply(normalizePreferences({ ...desired, ...patch }), true);
            },
            reset() {
                return this.set(DEFAULTS);
            },
            toggleMode() {
                const current = state.enabled ? resolveColorScheme(state.mode, colorScheme) : colorScheme;
                return this.set({ enabled: true, mode: current === "dark" ? "light" : "dark" });
            },
        };
    },
};

registry.category("services").add("minimalism_theme", minThemeService);
