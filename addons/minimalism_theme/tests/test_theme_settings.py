# SPDX-License-Identifier: LGPL-3.0-or-later
from odoo.exceptions import AccessError
from odoo.tests.common import TransactionCase, new_test_user, tagged

from ..models.theme_config import ACCENT_PRESETS, PARAM_PREFIX, read_theme_settings


@tagged("post_install", "-at_install")
class TestThemeSettings(TransactionCase):
    def test_all_seven_presets_round_trip(self):
        self.assertEqual(len(ACCENT_PRESETS), 7)
        for preset, _label in ACCENT_PRESETS:
            settings = self.env["res.config.settings"].create({"min_accent_preset": preset})
            settings.set_values()
            fresh = self.env["res.config.settings"].create({})
            self.assertEqual(fresh.min_accent_preset, preset)
            self.assertEqual(read_theme_settings(self.env["ir.config_parameter"].sudo()), {"accent_preset": preset})

    def test_free_form_colors_rejected(self):
        for invalid in ("#123456", "custom", "BLUE", "__proto__"):
            with self.assertRaises(ValueError), self.cr.savepoint():
                self.env["res.config.settings"].create({"min_accent_preset": invalid})

    def test_invalid_and_legacy_parameters_fall_back(self):
        params = self.env["ir.config_parameter"].sudo()
        params.set_param(PARAM_PREFIX + "accent_preset", "url(evil)")
        params.set_param(PARAM_PREFIX + "custom_colors", True)
        params.set_param(PARAM_PREFIX + "accent", "#000000")
        params.set_param(PARAM_PREFIX + "dark_surface", "#ffffff")
        params.set_param("unrelated.secret", "must-not-be-exposed")
        self.assertEqual(read_theme_settings(params), {"accent_preset": "blue"})
        params.set_param(PARAM_PREFIX + "accent_preset", False)
        self.assertEqual(read_theme_settings(params), {"accent_preset": "blue"})

    def test_legacy_global_night_mode_is_ignored(self):
        params = self.env["ir.config_parameter"].sudo()
        users = [new_test_user(self.env, login=f"min-test-{i}", groups="base.group_user") for i in range(2)]
        params.set_param(PARAM_PREFIX + "night_mode", True)
        for user in users:
            self.assertEqual(self.env["ir.http"].with_user(user).color_scheme(), "light")
        self.assertNotIn("night_mode", read_theme_settings(params))
        self.assertNotIn("min_night_mode", self.env["res.config.settings"]._fields)
        self.assertEqual(self.env["ir.http"].with_user(self.env.ref("base.public_user")).color_scheme(), "light")

    def test_regular_user_cannot_save_shared_settings(self):
        user = new_test_user(self.env, login="min-no-settings", groups="base.group_user")
        with self.assertRaises(AccessError), self.cr.savepoint():
            self.env["res.config.settings"].with_user(user).create({"min_accent_preset": "blue"}).execute()
        settings = self.env["res.config.settings"].create({"min_accent_preset": "blue"})
        with self.assertRaises(AccessError), self.cr.savepoint():
            settings.with_user(user).set_values()
        with self.assertRaises(AccessError), self.cr.savepoint():
            self.env["ir.config_parameter"].with_user(user).set_param(PARAM_PREFIX + "accent_preset", "blue")
