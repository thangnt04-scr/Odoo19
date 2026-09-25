# Validation — 19.0.1.1.0

Validated on **2026-09-22** with official **Odoo 19.0-20260908 Community** (arm64), PostgreSQL **17.7**, Google Chrome **153.0.8010.53**, Playwright **1.58.2** and Node **20.20.0**. Tests use disposable databases only.

Runtime image digest: `sha256:144175ec0039d52daff1d79f7e51c9281ca3c98b96c830feb49d09764a9f5d7c`.

## Runtime and branch adaptations

Odoo 19 uses the native split web/lazy bundles and the imported user singleton. The dark Bootstrap helper uses this version’s main text role. The main branch and 19.0 release branch share the same implementation.

Notebook tab color changes are immediate so text and surfaces do not cross through unreadable intermediate colors while switching modes. Navigation remains owned by Odoo; Minimalism’s observer only requests the native overflow calculation when systray width changes.

## Automated results

| Check | Result |
| --- | --- |
| Preference/service suite | PASS — all seven presets, 14 mode/accent contrasts, malformed settings, denied storage access, user/database isolation, tab events, failed loads and out-of-order requests. |
| Stylesheet lifecycle suite | PASS — inert staging, atomic activation, later native lazy CSS, exact original media restoration, print media, native-dark baseline restoration, timeouts/retry and no duplicate JavaScript. |
| Feature installation / Python suite | PASS — all 5 methods: preset persistence, arbitrary-value rejection, legacy/corrupt settings, no shared night-mode policy and administrator-only shared settings. |
| Appearance browser suite | PASS — 7 presets saved through Settings, 14 light/dark combinations, stable semantic colors, text and focus contrast, 390px Settings, ordinary-user access restrictions, personal mode/reload and unsaved form retention. |
| Night-mode browser suite | PASS — first stylesheet failure/retry; Discuss messages, dates, composer and draft retention; emoji picker; semantic notices; Calendar, CRM, Project and Settings; bar/line/pie graphs, live canvas labels and pivot; theme disable/enable and unchanged global cookie. |
| Edge-case browser suite | PASS — sanitized session payload, native keys preserved, real cross-tab mode/density/disable/reset, reload, swatches while disabled, growing systray/menu fitting, 390px CRM and search focus/boundary contrast. |
| Extracted ZIP minimal installation | PASS — only `web`, `base_setup` and their dependencies; all 5 Python methods, version-specific private dark styles, mode/reload persistence, native light restoration and no browser errors. Contacts, CRM, Project, Calendar and Mail remain uninstalled. |
| ZIP module upgrade | PASS — all 5 Python methods; a saved non-default Purple preset and an unrelated partner remain intact. |
| Module uninstall | PASS — native uninstall removes owned external IDs, preserves the unrelated partner and leaves the module uninstalled. |
| Listing/documentation | PASS — RST without warnings; all 8 listing images survive this Odoo version’s HTML sanitizer. |
| Media and release tooling | PASS — GIF decoding, dimensions/timing, all scenes, version labels, loop reset with tiny antialiased-edge tolerance, local brand/font loading, no external renderer requests, desktop/mobile previews, manifest/asset validation, Python/XML syntax and ZIP integrity. |
| Reproducibility | Two builds of the final source produce byte-identical ZIPs. The adjacent `.zip.sha256` records the checksum. |

Normal text targets **4.5:1** in tested states; focus indicators and meaningful control boundaries target **3:1**. The night suite measures composited backgrounds and opacity. This is the tested coverage, not a full accessibility audit.

## Screenshots and animations

The screenshots were captured from the actual Odoo 19 runtime using fictional records. Light/dark lists, forms, kanban, Discuss, shared settings and personal Appearance were reviewed. The capture helper waits for all twelve expected Contacts rows after legacy navigation before taking list screenshots. It removes transient input focus before capture.

| Asset | Dimensions | Encoded loop |
| --- | --- | --- |
| `cover.gif` | 1120 × 560 | 3.00s |
| `theme_screenshot.gif` | 1000 × 1210 | 3.00s |
| `day-night-demo.gif` | 1120 × 760 | 2.67s |
| `accent-demo.gif` | 1120 × 760 | 4.67s |

These are animated comparisons of real captures, not recordings of interactions. The portrait GIF is the sole manifest `_screenshot` image. Shared RivetFox branding is baked into the raster assets; local render fonts are not added to Odoo runtime dependencies.

## Reproduce

Run `npm ci`, `npm test`, then the browser scripts documented in the root README. Browser checks require a disposable database, `MIN_TEST_URL`, `MIN_TEST_DB`, `MIN_ALLOW_TEST_WRITES=1` and optionally `MIN_CHROME_PATH`. Run suites sequentially against each database. The feature database includes Contacts, Discuss, CRM, Calendar and Project; `test_minimal.cjs` uses a separate fresh ZIP-only database.

Python integration: `odoo -d TEST_DB -i minimalism_theme --without-demo --test-enable --test-tags=/minimalism_theme --stop-after-init`. Use `-u` for upgrade. `tools/test_lifecycle.py` runs in `odoo shell` only with an explicit disposable database/write opt-in and checks preserved fixtures before uninstalling.

Capture with `node tools/capture_screenshots.cjs`; render with `node tools/render_marketplace.cjs`; package with `python3 tools/build_release.py`; inspect encoded media and previews with `node tools/check_marketplace.cjs`. Local logs and images remain under ignored `dist/`.

## Scope and publication

This branch targets self-hosted Odoo 19 Community. Other supported Odoo versions have separate branches. Enterprise, Odoo.sh, Studio, spreadsheets, specialized editors, RTL, other browser engines and simultaneous backend themes were not validated. Native-dark restoration has a focused lifecycle test; no complete Enterprise installation was tested. Website, portal, POS, login and PDF reports are outside the theme’s scope.

Git publication does not register or rescan an Odoo Apps listing. No Odoo Apps scan, scanner acceptance or public marketplace card update is claimed here.
