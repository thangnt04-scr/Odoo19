// SPDX-License-Identifier: LGPL-3.0-or-later
// Run with Playwright/Chrome; no Odoo server or database required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.MIN_CHROME_PATH ? {executablePath: process.env.MIN_CHROME_PATH} : {})});
    try {
        const page = await browser.newPage();
        await page.route('https://appearance.test/**', route => {
            const url = route.request().url();
            if (url.endsWith('.css')) return route.fulfill({contentType: 'text/css', body: `body { background: ${url.includes('dark') ? '#09090b' : '#ffffff'}; }`});
            return route.fulfill({contentType: 'text/html', body: '<html><head><link rel="stylesheet" media="screen" href="/web.assets_web.min.css"><link rel="stylesheet" media="print" href="/web.assets_web_print.min.css"></head><body>Appearance test</body></html>'});
        });
        await page.goto('https://appearance.test/');
        const source = fs.readFileSync(path.join(__dirname, '../static/src/js/stylesheet_switcher.js'), 'utf8');
        await page.addScriptTag({content: source.replace('export class StylesheetSwitcher', 'window.StylesheetSwitcher = class StylesheetSwitcher')});
        const result = await page.evaluate(async () => {
            const switcher = new StylesheetSwitcher(document, async name => ({cssLibs: [`/${name}.min.css`], jsLibs: ['/never-execute.js']}), 'light', 100);
            const color = () => getComputedStyle(document.body).backgroundColor;
            const dark = await switcher.prepare('dark');
            const staged = color();
            switcher.activate('dark', dark);
            const active = color();
            const lazy = document.createElement('link');
            lazy.rel = 'stylesheet'; lazy.href = '/web.assets_backend_lazy.min.css';
            document.head.appendChild(lazy);
            await new Promise(resolve => { lazy.onload = resolve; });
            const lazyMedia = lazy.media;
            const afterLazy = color();
            switcher.activate(null);
            const restored = color();
            const restoredLazyMedia = lazy.getAttribute('media');
            const originals = [...document.querySelectorAll('link:not([data-min-stylesheet])')].map(el => el.media);
            return {staged, active, lazyMedia, afterLazy, restored, restoredLazyMedia, originals, scriptCount: document.querySelectorAll('script[src]').length,
                darkTarget: switcher.target(true,'dark'), lightTarget: switcher.target(true,'light'), disabledTarget: switcher.target(false,'dark')};
        });
        assert.deepEqual(result, {staged:'rgb(255, 255, 255)',active:'rgb(9, 9, 11)',lazyMedia:'print',afterLazy:'rgb(9, 9, 11)',restored:'rgb(255, 255, 255)',restoredLazyMedia:null,originals:['screen','print',''],scriptCount:0,darkTarget:'dark',lightTarget:null,disabledTarget:null});
        // Failure never activates incomplete CSS; a subsequent retry can succeed.
        await page.route('https://appearance.test/failure*.css', route => route.abort());
        const failed = await page.evaluate(async () => {
            let fail = true;
            const switcher = new StylesheetSwitcher(document, async name => ({cssLibs:[fail ? '/failure.css' : `/${name}.min.css`]}),'light',100);
            let rejected = false;
            try { await switcher.prepare('dark'); } catch { rejected = true; }
            const unchanged = getComputedStyle(document.body).backgroundColor;
            const leaked = document.querySelectorAll('link[href="/failure.css"]').length;
            fail = false;
            const links = await switcher.prepare('dark');
            switcher.activate('dark',links);
            return {rejected, unchanged, leaked, retry:getComputedStyle(document.body).backgroundColor};
        });
        assert.deepEqual(failed,{rejected:true,unchanged:'rgb(255, 255, 255)',leaked:0,retry:'rgb(9, 9, 11)'});
        assert.equal(await page.evaluate(async () => {
            const switcher = new StylesheetSwitcher(document, () => new Promise(() => {}), 'light', 20);
            try { await switcher.prepare('dark'); return false; } catch { return true; }
        }), true, 'A stalled bundle descriptor must not block Odoo startup indefinitely');
        await page.goto('https://appearance.test/');
        await page.addScriptTag({content: source.replace('export class StylesheetSwitcher', 'window.StylesheetSwitcher = class StylesheetSwitcher')});
        const nativeDark = await page.evaluate(async () => {
            const original = document.querySelector('link[media=screen]');
            await new Promise(resolve => { original.onload = resolve; original.href = '/web.assets_web_dark.min.css'; });
            const switcher = new StylesheetSwitcher(document, async name => ({cssLibs:[`/${name}.min.css`]}), 'dark');
            const target = switcher.target(true, 'light');
            switcher.activate(target, await switcher.prepare(target));
            const light = getComputedStyle(document.body).backgroundColor;
            switcher.activate(null);
            return {light, restored:getComputedStyle(document.body).backgroundColor, media:original.media};
        });
        assert.deepEqual(nativeDark, {light:'rgb(255, 255, 255)',restored:'rgb(9, 9, 11)',media:'screen'});
        console.log('PASS: inert CSS staging, atomic activation, lazy styles, exact restoration, print media, no duplicate JavaScript, load failure and retry');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
