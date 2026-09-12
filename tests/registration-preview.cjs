const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),shots=path.join(__dirname,'screenshots');fs.mkdirSync(shots,{recursive:true});
const headers=Object.fromEntries(fs.readFileSync(path.join(root,'_headers'),'utf8').split('\n\n')[0].split('\n').slice(1).filter(Boolean).map(l=>{const i=l.indexOf(':');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{for(const [k,v] of Object.entries(headers))res.setHeader(k,v);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.writeHead(404);res.end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1280,height:1000},{width:768,height:1024},{width:390,height:844}]){
   const context=await browser.newContext({viewport}),page=await context.newPage(),requests=[],errors=[];
   page.on('request',r=>requests.push({url:r.url(),method:r.method()}));page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/registration-preview.html');await page.locator('#pvRegistration').waitFor();
   assert.equal(await page.locator('.pv-person').count(),14);assert.equal(await page.locator('#pvMissions').count(),0);assert.equal(await page.locator('#pvLiveLink').count(),0);
   await page.locator('#pvPlayer').selectOption('demo-1');await page.locator('#pvMissions').filter({hasText:'dans la soirée'}).waitFor();
   assert.equal(await page.locator('#pvGuests').getAttribute('open'),null);
   await page.locator('#pvGuests summary').click();await page.locator('#pvGuestName').fill('Invité de démonstration');await page.locator('#pvGuestMember').check();await page.locator('#pvGuestPhone').fill('0600000000');
   await page.locator('#pvPlayer').selectOption('demo-2');assert.equal(await page.locator('#pvGuestName').inputValue(),'Invité de démonstration');assert.equal(await page.locator('#pvGuestPhone').inputValue(),'0600000000');
   await page.locator('#pvGuests summary').click();
   await page.screenshot({path:path.join(shots,'preview-registration-open-'+viewport.width+'.png'),fullPage:true});
   for(const phase of ['closed','review','ready']){await page.locator('#previewPhase').selectOption(phase);assert.equal(await page.locator('#pvLiveLink').count(),0);assert.equal(await page.locator('[data-action="join"]').count(),0);assert.equal(await page.locator('.pv-person').count(),14);assert.equal(await page.locator('#pvTeams').count(),phase==='ready'?1:0);}
   await page.locator('#previewPhase').selectOption('live');await page.locator('#pvLiveLink').filter({hasText:'0 – 0'}).waitFor();await page.locator('[data-action="live"]').click();await page.locator('#previewDialog').waitFor();await page.locator('[data-action="goal"]').click();await page.locator('#previewDialogBody').filter({hasText:'1 – 0'}).waitFor();await page.locator('#closePreviewDialog').click();
   await page.screenshot({path:path.join(shots,'preview-registration-live-'+viewport.width+'.png'),fullPage:true});
   await page.locator('#previewPhase').selectOption('finished');assert.equal(await page.locator('[data-action="rate"]').count(),1);await page.locator('[data-action="rate"]').click();await page.locator('#previewDialogBody').filter({hasText:'48 h'}).waitFor();await page.locator('#closePreviewDialog').click();
   await page.locator('#previewPhase').selectOption('expired');assert.equal(await page.locator('[data-action="rate"]').count(),0);assert.match(await page.locator('#pvMissions').innerText(),/48 h est terminée/);
   await page.locator('#previewSettings summary').first().click();await page.locator('#emptyInstructions').click();assert.equal(await page.locator('#pvGeneralInstructions').count(),0);assert.equal(await page.locator('#pvMissions').count(),0);
   await page.locator('[name="general"]').fill('   ');await page.locator('[name="history"]').uncheck();await page.locator('[name="views"]').uncheck();await page.locator('[name="reservation"]').fill('');
   for(const format of ['classic','pools','king_of_pitch']){await page.locator('[name="format"]').selectOption(format);await page.getByRole('button',{name:'Générer la prévisualisation',exact:true}).click();assert.equal(await page.locator('#pvGeneralInstructions').count(),0);assert.equal(await page.locator('#pvMissions').count(),0);assert.equal(await page.locator('#pvHistory').count(),0);await page.locator('#pvRules summary').click();assert.match(await page.locator('#pvRules').innerText(),format==='classic'?/classement aux points/:format==='pools'?/concept/:/Roi/);await page.locator('#pvRules summary').click();}
   await page.locator('#previewSettings summary').first().click();await page.locator('#previewPhase').selectOption('open');
   await page.locator('[data-action="team-mode"]').click();await page.locator('#pvTeamCode').fill('123456');await page.locator('[data-action="code"]').click();await page.locator('#pvTeamCreator').selectOption('demo-1');await page.locator('#pvTeamName').fill('Équipe test');await page.locator('#pvColor1').check();await page.locator('[data-action="team"]').click();await page.locator('#pvRegistration').filter({hasText:'Aucune invitation envoyée'}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow');
   assert.ok(await page.locator('#previewPage input,#previewPage select,#previewPage button').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width).every(n=>{const b=n.getBoundingClientRect(),p=document.querySelector('#previewStage').getBoundingClientRect();return b.left>=p.left-1&&b.right<=p.right+1})),'Controls stay within the preview');
   assert.deepEqual(errors,[]);assert.ok(requests.every(r=>r.method==='GET'&&r.url.startsWith(base+'/')),'Preview must not send writes or external requests');
   console.log('Premium preview phases, empty instructions, coorganizer, fields and zero network writes:',viewport.width,'OK');await context.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
