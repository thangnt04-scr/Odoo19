/** @odoo-module **/
// SPDX-License-Identifier: LGPL-3.0-or-later
import { onMounted, onWillUnmount } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { NavBar } from "@web/webclient/navbar/navbar";

// Counters and company names can grow without a window resize. Ask the native
// overflow algorithm to remeasure; leave menu ownership and navigation in Odoo.
patch(NavBar.prototype, {
    setup() {
        super.setup(...arguments);
        let observer;
        let frame;
        let measuredWidth;
        onMounted(() => {
            const tray = this.root.el?.querySelector(".o_menu_systray");
            if (!tray || !window.ResizeObserver) return;
            observer = new ResizeObserver(([entry]) => {
                const width = Math.round(entry.contentRect.width);
                if (width === measuredWidth) return;
                measuredWidth = width;
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => {
                    if (document.body.classList.contains("o_min_theme")) this.adapt();
                });
            });
            observer.observe(tray);
        });
        onWillUnmount(() => {
            observer?.disconnect();
            cancelAnimationFrame(frame);
        });
    },
});
