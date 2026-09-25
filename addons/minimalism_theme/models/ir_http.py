# SPDX-License-Identifier: LGPL-3.0-or-later
from odoo import models

from .theme_config import read_theme_settings


class IrHttp(models.AbstractModel):
    _inherit = "ir.http"

    def session_info(self):
        info = super().session_info()
        if self.env.user._is_internal():
            info["minimalism_theme"] = read_theme_settings(self.env["ir.config_parameter"].sudo())
        return info
