// SPDX-License-Identifier: LGPL-3.0-or-later
// Writes test settings and users. Run only against a disposable Odoo 19 database.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const origin=process.env.MIN_TEST_URL || 'http://127.0.0.1:19069';
const db=process.env.MIN_TEST_DB;
assert.ok(db && process.env.MIN_ALLOW_TEST_WRITES === '1', 'Set MIN_TEST_DB and MIN_ALLOW_TEST_WRITES=1 for a disposable database');
const presets={yellow:'#eab308',blue:'#2563eb',green:'#15803d',purple:'#7c3aed',pink:'#db2777',orange:'#c2410c',red:'#dc2626'};
function luminance(value) {
 const channels=value.startsWith('#') ? value.slice(1).match(/../g).map(x=>parseInt(x,16)) : value.match(/[\d.]+/g).slice(0,3).map(Number);
 return channels.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
(async()=>{
 const browser=await chromium.launch({...(process.env.MIN_CHROME_PATH ? {executablePath:process.env.MIN_CHROME_PATH} : {}),headless:true});
 const errors=[];
 async function login(name,password){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/web/login?db=${db}`);
  await page.locator('[name=login]').fill(name);await page.locator('[name=password]').fill(password);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await page.waitForSelector('.o_min_mode_toggle button',{timeout:90000});return page;
 }
 async function rpc(page,model,method,args=[]){return page.evaluate(async({model,method,args})=>(await fetch(`/web/dataset/call_kw/${model}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',id:1,params:{model,method,args,kwargs:{}}})})).json(),{model,method,args});}
 const admin=await login('admin','admin');
 await admin.goto(`${origin}/odoo/action-minimalism_theme.action_min_theme_settings`);
 await admin.waitForSelector('[name=min_accent_preset]');
 assert.equal(await admin.locator('[name=min_accent_preset] input[type=radio]').count(),7);
 assert.equal(await admin.locator('input[type=color]').count(),0);
 const baselines={};
 for(const [preset,color] of Object.entries(presets)){
  await admin.getByRole('radio',{name:preset[0].toUpperCase()+preset.slice(1),exact:true}).check();
  await Promise.all([admin.waitForEvent('load'),admin.getByRole('button',{name:'Save',exact:true}).click()]);
  await admin.waitForSelector('[name=min_accent_preset]');
  await admin.evaluate(()=>{
   document.querySelector('#min-qa')?.remove();
   const host=document.createElement('div');host.id='min-qa';host.style.cssText='position:fixed;right:20px;bottom:20px;width:600px;z-index:1000;padding:16px;background:var(--min-surface);color:var(--min-ink)';
   host.innerHTML=`<button id="qa-primary" class="btn btn-primary">Primary</button> <button id="qa-secondary" class="btn btn-secondary">Secondary</button>
    <div class="o_notebook"><ul class="nav nav-tabs"><li><a id="qa-tab" class="nav-link active">Active tab</a></li></ul></div>
    <table class="table table-hover table-striped o_list_table"><tbody><tr class="o_data_row"><td id="qa-striped">Striped row</td></tr><tr class="o_data_row"><td id="qa-hover">Hovered row</td></tr><tr class="table-active"><td id="qa-active">Active row</td></tr></tbody></table>
    <button class="qa-semantic btn btn-danger">Delete</button><button class="qa-semantic btn btn-success">Success</button><button class="qa-semantic btn btn-warning">Warning</button><button class="qa-semantic btn btn-success btn-link">Done</button><button class="qa-semantic btn btn-danger btn-link">Cancel</button>
    <div class="qa-semantic alert alert-danger">Error</div><div class="qa-semantic alert alert-success">Success</div><div class="qa-semantic alert alert-warning">Warning</div><span class="qa-semantic badge text-bg-danger">Error badge</span>`;
   document.body.appendChild(host);
  });
  for(const mode of ['light','dark']){
   if(await admin.locator('body').getAttribute('data-min-mode')!==mode)await admin.locator('.o_min_mode_toggle button').click();
   await admin.waitForSelector(`body[data-min-mode=${mode}]`);
   const tokens=await admin.locator('body').evaluate(el=>Object.fromEntries(['accent','accent-ink','accent-soft','surface','bg','ink','link'].map(k=>[k,getComputedStyle(el).getPropertyValue('--min-'+k).trim()])));
   assert.equal(tokens.accent,color);
   assert.equal(tokens.surface,mode==='dark'?'#18181b':'#ffffff');
   assert.equal(tokens.bg,mode==='dark'?'#09090b':'#fafafa');
   for(const selector of ['#qa-primary','#qa-tab']){
    const style=await admin.locator(selector).evaluate(el=>({color:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
    assert.ok(contrast(style.color,style.bg)>=4.5,`${preset}/${mode} ${selector}`);
   }
   await admin.locator('#qa-secondary').hover();
   const secondary=await admin.locator('#qa-secondary').evaluate(el=>({color:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
   if(contrast(secondary.color,secondary.bg)<4.5){console.log('TRANSITION CONTRAST',preset,mode,secondary);await admin.locator('#qa-secondary').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));console.log('SETTLED',await admin.locator('#qa-secondary').evaluate(el=>({color:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor})));}
   assert.ok(contrast(secondary.color,secondary.bg)>=4.5,`${preset}/${mode} secondary hover ${JSON.stringify(secondary)}`);
   await admin.locator('#qa-hover').hover();
   for(const selector of ['#qa-striped','#qa-hover','#qa-active']){
    const style=await admin.locator(selector).evaluate(el=>({color:getComputedStyle(el).color,shadow:getComputedStyle(el).boxShadow}));
    assert.ok(contrast(style.color,tokens['accent-soft'])>=4.5,`${preset}/${mode} ${selector} ${JSON.stringify(style)}`);
   }
   const semantics=await admin.locator('.qa-semantic').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return [s.color,s.backgroundColor,s.borderColor]}));
   if(!baselines[mode])baselines[mode]=semantics;else assert.deepEqual(semantics,baselines[mode],`${preset}/${mode} must preserve status colors`);
   await admin.locator('.o_min_mode_toggle button').focus();
   const brand=await admin.locator('.o_navbar_breadcrumbs').evaluate(el=>getComputedStyle(el).color);
   assert.ok(contrast(brand,tokens.surface)>=4.5,`${preset}/${mode} navbar title contrast`);
   const outline=await admin.locator('.o_min_mode_toggle button').evaluate(el=>getComputedStyle(el).outlineColor);
   assert.ok(contrast(outline,tokens.surface)>=3,`${preset}/${mode} navbar focus visibility`);
  }
  await admin.evaluate(()=>document.querySelector('#min-qa').remove());
 }

 await admin.setViewportSize({width:390,height:844});
 await admin.locator('[name=min_accent_preset]').waitFor({state:'visible'});
 await admin.waitForFunction(()=>document.body.scrollWidth<=innerWidth,{},{timeout:5000});
 const mobileBrand=await admin.locator('.o_navbar_breadcrumbs').evaluate(el=>getComputedStyle(el).color);
 assert.ok(contrast(mobileBrand,'#18181b')>=4.5,'mobile navbar title contrast');

 const existing=await rpc(admin,'res.users','search',[[['login','=','preset-employee']]]);
 if(!existing.result.length)await rpc(admin,'res.users','create',[{name:'Preset Employee',login:'preset-employee',password:'theme-test-employee'}]);
 const employee=await login('preset-employee','theme-test-employee');
 assert.equal(await employee.locator('body').getAttribute('data-min-mode'),'light');
 assert.equal(await employee.locator('body').evaluate(el=>el.style.getPropertyValue('--min-accent')),presets.red);
 const denied=await rpc(employee,'res.config.settings','create',[{min_accent_preset:'blue'}]);assert.equal(denied.error.data.name,'odoo.exceptions.AccessError');
 await employee.getByRole('button',{name:'Switch to night mode',exact:true}).click();
 await employee.waitForSelector('body[data-min-mode=dark]');
 await employee.reload();await employee.waitForSelector('body[data-min-mode=dark]');
 assert.equal(await employee.locator('body').evaluate(el=>el.style.getPropertyValue('--min-accent')),presets.red);
 // Exercise actual standard views, not only the isolated contrast fixtures.
 await admin.setViewportSize({width:1440,height:1000});
 const contact=await rpc(admin,'res.partner','create',[{name:'Night Mode QA',email:'night-mode@example.test',is_company:true}]);
 assert.ok(contact.result,JSON.stringify(contact));
 const action=await rpc(admin,'ir.actions.act_window','create',[{name:'Theme QA Contacts',res_model:'res.partner',view_mode:'list,form',domain:JSON.stringify([['id','=',contact.result]])}]);
 await admin.goto(`${origin}/odoo/action-${action.result}`);
 await admin.waitForSelector('.o_list_table .o_data_row');
 async function readable(selector,minimum=4.5){
  const elements=admin.locator(selector).filter({visible:true});
  assert.ok(await elements.count(),`Missing visible control: ${selector}`);
  for(const el of await elements.all()){
   const style=await el.evaluate(e=>{
    let p=e,bg='';
    while(p){bg=getComputedStyle(p).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent')break;p=p.parentElement;}
    return {color:getComputedStyle(e).color,bg};
   });
   assert.ok(contrast(style.color,style.bg)>=minimum,`${selector}: ${JSON.stringify(style)}`);
  }
 }
 for(const mode of ['light','dark']){
  if(await admin.locator('body').getAttribute('data-min-mode')!==mode)await admin.locator('.o_min_mode_toggle button').click();
  await admin.waitForSelector(`body[data-min-mode=${mode}]`);
  await readable('[aria-label="Actions menu"], .o_optional_columns_dropdown_toggle',3);
  await readable('.o-mail-ActivityButton i',3);
 }
 await admin.locator('.o_list_table .o_data_row').first().click();
 await admin.waitForSelector('.o_form_sheet');
 await admin.locator('.o-mail-Message-body').first().waitFor();
 await readable('.o_form_label');
 await readable('.o_control_panel .breadcrumb a');
 await readable('.o_notebook .nav-link:not(.active)');
 await admin.locator('.o_field_email').hover();
 await readable('.o_field_email a',3);
 await readable('.o-mail-Message-date');
 await readable('.o-mail-Chatter .text-action',3);
 const input=admin.locator('[name="name"] input');
 await input.fill('Unsaved theme toggle check');
 await admin.getByRole('button',{name:'Switch to day mode',exact:true}).click();
 await admin.waitForSelector('body[data-min-mode=light]');
 assert.equal(await input.inputValue(),'Unsaved theme toggle check');
 assert.equal(await admin.locator('.o_form_sheet').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
 assert.deepEqual(errors,[]);
 console.log('PASS: all 7 admin presets saved via real Odoo UI; 14 day/night combinations; >=4.5 text contrast; >=3 navbar focus contrast; unchanged status colors; readable hover/striped/active rows; mobile layout; admin-only access; personal night-mode persistence; standard form labels, links and chatter; unsaved edits survive mode switching');
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
