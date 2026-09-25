# SPDX-License-Identifier: LGPL-3.0-or-later
from odoo import fields, models

from .theme_config import ACCENT_PRESETS, DEFAULT_ACCENT_PRESET, PARAM_PREFIX


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    min_accent_preset = fields.Selection(
        selection=ACCENT_PRESETS,
        string="Accent color",
        default=DEFAULT_ACCENT_PRESET,
        config_parameter=PARAM_PREFIX + "accent_preset",
        required=True,
        help="Choose a shared accent preset. Day/night surfaces, text contrast and status colors stay consistent.",
    )
