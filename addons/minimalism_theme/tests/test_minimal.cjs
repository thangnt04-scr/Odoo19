// SPDX-License-Identifier: LGPL-3.0-or-later
// Disposable ZIP-install database only. Creates lifecycle fixtures.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const origin=process.env.MIN_TEST_URL,db=process.env.MIN_TEST_DB;
 assert.ok(origin && db && process.env.MIN_ALLOW_TEST_WRITES === '1', 'Disposable database and write opt-in required');
 const browser=await chromium.launch({headless:true,executablePath:process.env.MIN_CHROME_PATH});
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/web/login?db=${db}`);
  await page.locator('[name=login]').fill('admin');await page.locator('[name=password]').fill('admin');
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await page.waitForSelector('.o_min_mode_toggle button',{timeout:90000});
  await page.getByRole('button',{name:'Switch to night mode',exact:true}).click();
  await page.waitForSelector('body[data-min-mode=dark]',{timeout:90000});
  assert.equal(await page.locator('link[data-min-stylesheet][media=screen]').count(),2);
  assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(9, 9, 11)');
  await page.reload();await page.waitForSelector('body[data-min-mode=dark]');
  await page.getByRole('button',{name:'Switch to day mode',exact:true}).click();
  await page.waitForSelector('body[data-min-mode=light]');
  assert.equal(await page.locator('link[data-min-stylesheet][media=screen]').count(),0);
  const rpc=async(model,method,args)=>{
   const result=await page.evaluate(async ({model,method,args})=>(await fetch(`/web/dataset/call_kw/${model}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',id:1,params:{model,method,args,kwargs:{}}})})).json(),{model,method,args});
   assert.ok(!result.error,JSON.stringify(result.error));return result.result;
  };
  const unexpected = await rpc('ir.module.module','search',[[['name','in',['contacts','crm','project','calendar','mail']],['state','=','installed']]]);
  assert.deepEqual(unexpected, [], 'Minimal install must not bring in optional apps');
  const config=await rpc('res.config.settings','create',[{min_accent_preset:'purple'}]);
  await rpc('res.config.settings','set_values',[[config]]);
  await rpc('res.partner','create',[{name:'Min lifecycle retained partner'}]);
  assert.deepEqual(errors,[]);console.log(`PASS ${db}: ZIP-only dependencies, main/lazy dark CSS, persistence, native day restoration, no browser errors; upgrade/uninstall fixtures saved`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
