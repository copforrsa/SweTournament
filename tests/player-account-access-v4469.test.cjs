const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
test('Android navigation uses immediate touch handling without expensive blur',()=>{
 const dom=new JSDOM('<nav class="tabs"><button data-view="home">Accueil</button><button data-view="myplayer">Mon profil joueur</button></nav>',{runScripts:'outside-only'});
 const w=dom.window;w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 w.eval(fs.readFileSync(path.join(__dirname,'../mobile-nav-v4361.js'),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const css=w.document.getElementById('sweMobileNav4361Css').textContent;
 assert.match(css,/backdrop-filter:none/);assert.match(css,/touch-action:manipulation/);
 assert.equal(w.document.querySelector('[data-view="myplayer"] .swe4361-nav-label').textContent,'Profil');
});
test('player account access is loaded before workspace UI and managed from Super Admin',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 assert.ok(source.indexOf("sb.rpc('get_my_player_account_access_v1')")<source.indexOf("sb.from('workspace_members')"));
 assert.match(source,/data-sa-player-account-access/);
 assert.match(source,/super_admin_set_player_account_access_v1/);
 assert.match(source,/tab\[data-view=\"myplayer\"\].*playerAccountAccess/);
});
