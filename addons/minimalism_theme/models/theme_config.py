# SPDX-License-Identifier: LGPL-3.0-or-later
PARAM_PREFIX = "minimalism_theme."
DEFAULT_ACCENT_PRESET = "blue"
ACCENT_PRESETS = [
    ("yellow", "Yellow"),
    ("blue", "Blue"),
    ("green", "Green"),
    ("purple", "Purple"),
    ("pink", "Pink"),
    ("orange", "Orange"),
    ("red", "Red"),
]


def read_theme_settings(parameters):
    """Expose only the approved preset; legacy arbitrary colors are retired."""
    preset = parameters.get_param(PARAM_PREFIX + "accent_preset", DEFAULT_ACCENT_PRESET)
    if preset not in dict(ACCENT_PRESETS):
        preset = DEFAULT_ACCENT_PRESET
    return {"accent_preset": preset}
