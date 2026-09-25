// SPDX-License-Identifier: LGPL-3.0-or-later
// Writes local fixtures. Use only a disposable Odoo 19 database with Contacts,
// Discuss, CRM, Calendar and Project installed; never a production database.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const origin = process.env.MIN_TEST_URL || 'http://127.0.0.1:19069';
const db = process.env.MIN_TEST_DB;
assert.ok(db && process.env.MIN_ALLOW_TEST_WRITES === '1', 'Disposable database and MIN_ALLOW_TEST_WRITES=1 required');
(async () => {
 const browser = await chromium.launch({headless:true,...(process.env.MIN_CHROME_PATH ? {executablePath:process.env.MIN_CHROME_PATH} : {})});
 try {
  const context = await browser.newContext({viewport:{width:1440,height:960}});
  const page = await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/web/login?db=${db}`);
  await page.locator('[name=login]').fill('admin'); await page.locator('[name=password]').fill('admin');
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await page.waitForSelector('.o_min_mode_toggle button',{timeout:90000});
  const cookiesBefore = (await context.cookies()).filter(c=>c.name==='color_scheme');
  const setMode = async mode => {
   if(await page.locator('body').getAttribute('data-min-mode')!==mode) await page.locator('.o_min_mode_toggle button').click();
   await page.waitForSelector(`body[data-min-mode=${mode}]`,{timeout:90000});
  };
  const rpc = async (model,method,args=[]) => {
   const response = await page.evaluate(async ({model,method,args}) => (await fetch(`/web/dataset/call_kw/${model}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',id:1,params:{model,method,args,kwargs:{}}})})).json(),{model,method,args});
   assert.ok(!response.error,JSON.stringify(response.error)); return response.result;
  };
  async function readable(selector,{surface=false,pseudo=null}={}) {
   const nodes=page.locator(selector).filter({visible:true});
   assert.ok(await nodes.count(),`Missing ${selector}`);
   for (const node of await nodes.all()) {
    const result=await node.evaluate((el,{pseudo})=>{
     const parse=value=>{const a=value.match(/[\d.]+/g).map(Number);return [...a.slice(0,3),a[3]??1];};
     const mix=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1];
     const background=e=>e?mix(parse(getComputedStyle(e).backgroundColor),background(e.parentElement)):[255,255,255,1];
     const lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
     const style=getComputedStyle(el,pseudo),bg=background(el);let opacity=pseudo?Number(style.opacity):1;
     for(let p=el;p;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);
     const color=parse(style.color);color[3]*=opacity;const ink=mix(color,bg);
     return {color:style.color,bg,opacity,contrast:(Math.max(lum(ink),lum(bg))+.05)/(Math.min(lum(ink),lum(bg))+.05),brightness:lum(bg)};
    },{pseudo});
    assert.ok(result.contrast>=4.5,`${selector}: ${JSON.stringify(result)}`);
    if(surface)assert.ok(result.brightness<.15,`${selector} must use a dark surface: ${JSON.stringify(result)}`);
   }
  }
  // An interrupted first load leaves the current page readable and can be retried.
  await page.route('**/minimalism_theme.assets*.css',route=>route.abort());
  await page.locator('.o_min_mode_toggle button').click();
  await page.getByText('Could not load the appearance styles.',{exact:false}).waitFor();
  assert.equal(await page.locator('body').getAttribute('data-min-mode'),'light');
  await page.unroute('**/minimalism_theme.assets*.css');
  await setMode('dark');
  await page.goto(`${origin}/odoo/discuss`);
  await page.locator('.o-mail-DiscussSidebar').getByText('OdooBot',{exact:true}).click();
  await page.locator('.o-mail-Message-body').first().waitFor();
  for(const selector of ['.o-mail-DiscussSidebarChannel-itemName','.o-mail-Message-author','.o-mail-Message-body','.o-mail-Message-date','.o-mail-DateSection span']) await readable(selector,{surface:true});
  await readable('.o-mail-Composer-input',{surface:true,pseudo:'::placeholder'});
  const draft=page.locator('.o-mail-Composer-input');await draft.fill('Unsaved message draft');
  await setMode('light');assert.equal(await draft.inputValue(),'Unsaved message draft');
  await setMode('dark');assert.equal(await draft.inputValue(),'Unsaved message draft');
  // Popovers and modal surfaces inherit the same dark foundation.
  await page.getByRole('button',{name:'Add Emojis',exact:true}).click();
  await page.locator('.o-EmojiPicker').waitFor();
  await readable('.o-EmojiPicker input',{surface:true,pseudo:'::placeholder'});
  await page.keyboard.press('Escape');
  // Fixed-color semantic notices must remain readable too.
  await page.evaluate(()=>{const fixture=document.createElement('div');fixture.id='min-alert-qa';fixture.style.cssText='position:fixed;top:160px;left:350px;z-index:2000';fixture.innerHTML=['success','info','warning','danger'].map(type=>`<div class="alert alert-${type}"><h4>${type}</h4><p>Notice text</p><small class="text-muted">Details</small></div>`).join('');document.body.appendChild(fixture)});
  await readable('#min-alert-qa h4, #min-alert-qa p, #min-alert-qa small');
  await page.evaluate(()=>document.querySelector('#min-alert-qa').remove());
  const project=await rpc('project.project','create',[{name:'Night mode regression project'}]);
  const stage=await rpc('project.task.type','create',[{name:'In progress',project_ids:[[6,0,[project]]]}]);
  const task=await rpc('project.task','create',[{name:'Night mode regression task',project_id:project,stage_id:stage,user_ids:[[6,0,[2]]]}]);
  const lead=await rpc('crm.lead','create',[{name:'Night mode regression lead',type:'opportunity',expected_revenue:4000}]);
  const graph=await rpc('ir.actions.act_window','create',[{name:'Night mode graphs',res_model:'crm.lead',view_mode:'graph,pivot,list',context:"{'group_by':['stage_id']}"}]);
  for(const [route,selector] of [
   ['action-calendar.action_calendar_event','.o_calendar_renderer .fc-col-header-cell-cushion'],
   ['action-crm.crm_lead_action_pipeline','.o_kanban_header .o_column_title, .o_kanban_record .o_kanban_record_title'],
   ['action-project.action_view_task','.o_kanban_record .fw-bold.fs-5'],
   ['action-minimalism_theme.action_min_theme_settings','[name=min_accent_preset] label'],
  ]) {
   await page.goto(`${origin}/odoo/${route}`);await page.locator(selector).first().waitFor();await readable(selector,{surface:true});
  }
  await page.goto(`${origin}/odoo/action-${graph}`);await page.waitForSelector('.o_graph_renderer canvas');
  await page.waitForFunction(()=>window.Chart && Chart.getChart(document.querySelector('.o_graph_renderer canvas')));
  for(const mode of ['dark','light','dark']) {
   await setMode(mode);
   const chart=await page.evaluate(()=>{const c=Chart.getChart(document.querySelector('.o_graph_renderer canvas'));return {ticks:c.options.scales.x.ticks.color,legend:c.legend.legendItems.map(l=>l.fontColor),expected:getComputedStyle(document.body).getPropertyValue('--min-ink').trim()}});
   assert.equal(chart.ticks,chart.expected);assert.ok(chart.legend.every(color=>color===chart.expected));
  }
  for(const type of ['line','pie','bar']) {
   await page.locator(`button[data-mode=${type}]`).click();
   await page.waitForFunction(type=>Chart.getChart(document.querySelector('.o_graph_renderer canvas')).config.type===type,type);
  }
  await page.locator('.o_switch_view.o_pivot').click();await page.waitForSelector('.o_pivot table th');
  await readable('.o_pivot th',{surface:true});
  // Disabling restores native CSS; reenabling returns to this user's saved mode.
  await page.locator('.o_user_menu button').click();await page.getByText('Appearance',{exact:true}).click();
  await page.getByLabel('Use Minimalism theme').uncheck();await page.waitForSelector('body:not(.o_min_theme)');
  assert.equal(await page.locator('link[data-min-stylesheet][media=screen]').count(),0);
  await page.getByLabel('Use Minimalism theme').check();await page.waitForSelector('body[data-min-mode=dark]');
  await readable('.o_min_appearance',{surface:true});await page.getByRole('button',{name:'Done',exact:true}).click();
  assert.deepEqual((await context.cookies()).filter(c=>c.name==='color_scheme'),cookiesBefore);
  assert.deepEqual(errors,[]);
  console.log('PASS: failed CSS load/retry, Discuss/channel/message/composer contrast, draft retention, emoji picker, semantic notices, Calendar, CRM, Project, Settings, graph/pivot and live canvas updates, original appearance restoration, unchanged global cookie');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
