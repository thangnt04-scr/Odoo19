/** @odoo-module **/
// SPDX-License-Identifier: LGPL-3.0-or-later

import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

export class MinAppearanceDialog extends Component {
    static template = "minimalism_theme.AppearanceDialog";
    static components = { Dialog };
    static props = { close: Function };

    setup() {
        this.theme = useService("minimalism_theme");
        this.state = useState(this.theme.state);
        this.status = useState(this.theme.status);
        this.title = _t("Appearance");
    }

    setDensity(event) {
        this.theme.set({ density: event.target.value });
    }

    toggle(event) {
        this.theme.set({ enabled: event.target.checked });
    }

    reset() {
        this.theme.reset();
    }
}

registry.category("user_menuitems").add("minimalism_theme.appearance", (env) => ({
    type: "item",
    id: "minimalism_theme_appearance",
    description: _t("Appearance"),
    sequence: 55,
    callback: () => env.services.dialog.add(MinAppearanceDialog),
}));
