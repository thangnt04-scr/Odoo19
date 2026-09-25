# Minimalism Backend Theme

A shadcn/ui-inspired backend theme for self-hosted Odoo 19 Community by RivetFox. Light zinc surfaces, rounded controls and fine borders, with a complete personal dark mode.

Install this `minimalism_theme` directory directly under an Odoo add-ons path, restart Odoo, update the Apps list, remove the Apps filter, and install **Minimalism Backend Theme**. Only `web` and `base_setup` are required.

Settings administrators choose seven shared accents under **Settings → Minimalism**. Blue is the default. Save and reload open sessions to apply a new database-wide preset. Every internal user can switch day/night from the top bar and use **Avatar → Appearance** to disable the theme, adjust table spacing or reset personal preferences.

Personal preferences are stored in this browser, isolated by origin, database and user; same-user tabs synchronize. No cross-device synchronization. Disabling restores the original Odoo appearance. Reset follows that original mode and leaves the shared accent alone. A top-bar mode change re-enables the theme. Failed stylesheet loads keep the previous appearance usable and permit retry. Unsaved forms and message drafts remain intact.

No external services, fonts, React or Tailwind runtime are required. Example contacts and optional apps shown in screenshots are not installed by the theme.

Backend only. Website, portal, POS, login and PDF reports are outside scope. Enterprise, Odoo.sh, Studio, spreadsheets, specialized editors, RTL and coexistence with other backend themes are unverified. Use one backend theme at a time. Odoo Online cannot install filesystem add-ons.

This checkout supports Odoo 19. Separate `16.0`, `17.0`, `18.0` and `19.0` branches are available at https://github.com/Welgum/odoo-minimalism-theme. Install the matching branch.

For updates, restart and upgrade the module to rebuild assets. See `VALIDATION.md` for tested coverage. LGPL-3.0-or-later; applicable attributions are in `THIRD_PARTY_NOTICES.md`.

Publisher: https://rivetfox.pro
