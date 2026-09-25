{
    "name": "Minimalism Backend Theme",
    "summary": "Odoo 19 Community backend theme with dark mode and seven accent colors",
    "version": "19.0.1.1.0",
    "category": "Themes/Backend",
    "author": "RivetFox",
    "website": "https://rivetfox.pro",
    "license": "LGPL-3",
    "description": """
Minimalism is a minimal, open-source backend theme for Odoo 19 Community,
developed by RivetFox. A shadcn/ui-inspired interface with neutral surfaces,
fine borders, rounded controls, and seven administrator-managed accent presets.

Each user can switch light/dark mode in the top bar, choose comfortable
or compact table spacing, and disable the theme in the Appearance menu.
Personal preferences stay in the current browser, database, and user.

Includes dark styles for Discuss, Calendar, CRM, Project, forms, lists,
kanban boards, and standard graph/pivot views.

No external services, fonts, CDNs, or extra Python packages are required.
This module styles the backend only. Enterprise-specific screens and
third-party themes are not verified. Not compatible with Odoo Online.
""",
    "images": [
        "static/description/cover.gif",
        "static/description/theme_screenshot.gif",
        "static/description/backend-list.png",
        "static/description/day-night-demo.gif",
        "static/description/accent-demo.gif",
        "static/description/night-mode.png",
        "static/description/discuss-night.png",
        "static/description/admin-presets.png",
        "static/description/contact-form.png",
        "static/description/contacts-kanban.png",
        "static/description/personal-appearance.png",
    ],
    "depends": ["web", "base_setup"],
    "data": ["views/res_config_settings_views.xml"],
    "assets": {
        "web.assets_backend": [
            "minimalism_theme/static/src/css/theme.css",
            "minimalism_theme/static/src/js/preferences.js",
            "minimalism_theme/static/src/js/stylesheet_switcher.js",
            "minimalism_theme/static/src/js/theme_service.js",
            "minimalism_theme/static/src/js/mode_toggle.js",
            "minimalism_theme/static/src/js/navbar.js",
            "minimalism_theme/static/src/js/appearance_dialog.js",
            "minimalism_theme/static/src/xml/appearance_dialog.xml",
            "minimalism_theme/static/src/xml/mode_toggle.xml",
        ],
        # Private bundles leave Odoo's original appearance intact when disabled.
        # Including the native dark bundles also includes installed apps' dark rules.
        "minimalism_theme.assets_web_dark": [
            ("include", "web.assets_web_dark"),
            ("before", "web/static/src/scss/primary_variables.scss", "minimalism_theme/static/src/scss/dark_primary.scss"),
            ("before", "web/static/src/scss/bootstrap_overridden.scss", "minimalism_theme/static/src/scss/dark_bootstrap.scss"),
            ("after", "web/static/lib/bootstrap/scss/_functions.scss", "minimalism_theme/static/src/scss/dark_functions.scss"),
            "minimalism_theme/static/src/scss/dark_components.scss",
        ],
        "minimalism_theme.assets_backend_lazy_dark": [
            ("include", "web.assets_backend_lazy_dark"),
            ("before", "web/static/src/scss/primary_variables.scss", "minimalism_theme/static/src/scss/dark_primary.scss"),
            ("before", "web/static/src/scss/bootstrap_overridden.scss", "minimalism_theme/static/src/scss/dark_bootstrap.scss"),
            ("after", "web/static/lib/bootstrap/scss/_functions.scss", "minimalism_theme/static/src/scss/dark_functions.scss"),
        ],
        "web.assets_backend_lazy": [
            "minimalism_theme/static/src/js/graph_renderer.js",
        ],
    },
    "installable": True,
    "application": False,
    "auto_install": False,
}
