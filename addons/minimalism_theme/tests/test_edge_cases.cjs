// SPDX-License-Identifier: LGPL-3.0-or-later
// Real browser integration for theme-specific controls and dynamic menu fitting.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const origin = process.env.MIN_TEST_URL;
const db = process.env.MIN_TEST_DB;
assert.ok(origin && db && process.env.MIN_ALLOW_TEST_WRITES === '1', 'Disposable database required');
(async () => {
 const browser = await chromium.launch({headless:true,...(process.env.MIN_CHROME_PATH?{executablePath:process.env.MIN_CHROME_PATH}:{})});
 try {
  const context = await browser.newContext({viewport:{width:1000,height:800}});
  const errors=[]; context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
  const first=await context.newPage();
  await first.goto(`${origin}/web/login?db=${encodeURIComponent(db)}`);
  await first.locator('[name=login]').fill('admin');await first.locator('[name=password]').fill('admin');
  await first.getByRole('button',{name:'Log in',exact:true}).click();
  await first.waitForSelector('body.o_min_theme');
  const session=await first.evaluate(async()=> (await (await fetch('/web/session/get_session_info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',params:{},id:1})})).json()).result);
  assert.deepEqual(Object.keys(session.minimalism_theme),['accent_preset']);
  assert.ok(session.uid && session.user_context,'Native session keys are preserved');
  const second=await context.newPage();await second.goto(`${origin}/odoo`);await second.waitForSelector('body.o_min_theme');
  await first.locator('.o_min_mode_toggle button').click();
  await first.waitForSelector('body[data-min-mode=dark]');await second.waitForSelector('body[data-min-mode=dark]');
  await first.locator('.o_user_menu button').click();await first.getByText('Appearance',{exact:true}).click();
  await first.getByLabel('Compact',{exact:true}).check();await second.waitForSelector('body[data-min-density=compact]');
  await second.reload();await second.waitForSelector('body[data-min-density=compact][data-min-mode=dark]');
  await first.getByLabel('Use Minimalism theme').uncheck();await second.waitForSelector('body:not(.o_min_theme)');
  await second.goto(`${origin}/odoo/action-minimalism_theme.action_min_theme_settings`);
  await second.waitForSelector('[name=min_accent_preset]');
  assert.equal(await second.locator('[name=min_accent_preset] label').count(),7);
  const swatches=await second.locator('[name=min_accent_preset] label').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node,'::before').backgroundColor));
  assert.equal(new Set(swatches).size,7,'Disabled theme keeps all seven labeled swatches');
  await first.getByRole('button',{name:'Reset defaults',exact:true}).click();
  await second.waitForSelector('body.o_min_theme[data-min-density=comfortable][data-min-mode=light]');
  await first.getByRole('button',{name:'Done',exact:true}).click();
  await first.goto(`${origin}/odoo/action-crm.crm_lead_action_pipeline`);
  await first.waitForSelector('.o_menu_sections');
  await first.evaluate(()=>{const spacer=document.createElement('span');spacer.id='min-growing-tray';spacer.style.cssText='display:block;flex:none;width:550px';document.querySelector('.o_menu_systray').prepend(spacer)});
  await first.waitForFunction(()=>document.querySelector('.o_menu_sections_more')?.getClientRects().length);
  const positions=await first.evaluate(()=>{const tray=document.querySelector('.o_menu_systray').getBoundingClientRect();return [...document.querySelector('.o_menu_sections').children].filter(el=>el.getClientRects().length).map(el=>[el.getBoundingClientRect().right,tray.left])});
  assert.ok(positions.every(([right,left])=>right<=left+1),'Growing counters must not overlap menu items');
  await first.evaluate(()=>document.querySelector('#min-growing-tray').remove());
  await first.setViewportSize({width:390,height:844});
  await first.waitForFunction(()=>document.body.scrollWidth<=innerWidth);
  await first.screenshot({path:'dist/mobile-crm.png'});
  await first.setViewportSize({width:1440,height:960});
  await first.goto(`${origin}/odoo/action-contacts.action_contacts`);
  await first.waitForSelector('.o_searchview_input');
  await first.locator('.o_searchview_input').focus();
  assert.equal(await first.locator('.o_searchview_input').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  assert.equal(await first.locator('.o_searchview').evaluate(el=>getComputedStyle(el).outlineStyle),'solid','Composite focus ring remains visible');
  // The actual compiled controls must meet the boundary contrast target.
  const ratio=await first.locator('.o_searchview').evaluate(el=>{
   const s=getComputedStyle(el);const lum=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
   const a=lum(s.borderTopColor),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  assert.ok(ratio>=3,`Input boundary contrast ${ratio}`);
  assert.deepEqual(errors,[]);
  console.log('PASS: sanitized session, real cross-tab mode/density/disable/reset, reload, unthemed swatches, dynamic navbar growth, 390px CRM, single search focus ring and >=3 input boundary contrast');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
