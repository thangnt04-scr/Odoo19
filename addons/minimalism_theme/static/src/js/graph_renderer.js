/** @odoo-module **/
// SPDX-License-Identifier: LGPL-3.0-or-later

import { GraphRenderer } from "@web/views/graph/graph_renderer";
import { patch } from "@web/core/utils/patch";
import { useBus } from "@web/core/utils/hooks";

// Canvas text cannot inherit CSS. Odoo's default graph colors are captured from
// its global cookie at module load; Min preferences belong to this user/database.
patch(GraphRenderer.prototype, {
    setup() {
        super.setup(...arguments);
        useBus(this.env.bus, "MIN:APPEARANCE_CHANGED", () => {
            if (this.chart) this.renderChart();
        });
    },

    getChartConfig() {
        const config = super.getChartConfig(...arguments);
        if (!document.body.classList.contains("o_min_theme")) return config;
        const style = getComputedStyle(document.body);
        const ink = style.getPropertyValue("--min-ink").trim();
        const line = style.getPropertyValue("--min-line").trim();
        for (const [axis, scale] of Object.entries(config.options.scales || {})) {
            if (scale.ticks) scale.ticks.color = ink;
            if (scale.title) scale.title.color = ink;
            if (axis === "y" && scale.grid) scale.grid.color = line;
        }
        const labels = config.options.plugins.legend.labels;
        const generateLabels = labels.generateLabels;
        labels.color = ink;
        labels.generateLabels = (...args) => generateLabels(...args).map((label) => ({ ...label, fontColor: ink }));
        // Replace the line chart's cookie-colored overlay with a palette-aware grid.
        config.plugins = (config.plugins || []).map((plugin) => plugin.id !== "gridOnTop" ? plugin : {
            id: "minGridOnTop",
            afterDraw(chart) {
                const { ctx, chartArea, scales } = chart;
                ctx.save();
                ctx.strokeStyle = line;
                ctx.lineWidth = 1;
                scales.y.ticks.forEach((_, index) => {
                    const y = scales.y.getPixelForTick(index);
                    ctx.beginPath();
                    ctx.moveTo(chartArea.left - 8, y);
                    ctx.lineTo(chartArea.right, y);
                    ctx.stroke();
                });
                scales.x.ticks.forEach((_, index) => {
                    const x = scales.x.getPixelForTick(index);
                    ctx.beginPath();
                    ctx.moveTo(x, chartArea.bottom);
                    ctx.lineTo(x, chartArea.bottom + 8);
                    ctx.stroke();
                });
                for (const point of chart.getActiveElements()) {
                    const x = scales.x.getPixelForTick(point.index);
                    ctx.beginPath();
                    ctx.moveTo(x, chartArea.top);
                    ctx.lineTo(x, chartArea.bottom);
                    ctx.stroke();
                }
                ctx.restore();
            },
        });
        return config;
    },
});
