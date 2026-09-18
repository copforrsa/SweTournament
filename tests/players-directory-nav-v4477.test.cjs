const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'players-directory-nav-v4477.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'hotfix-v4244.js'),'utf8');

assert.match(source,/swe4477PlayerAlphabet/,'the player list must expose an alphabetical directory');
assert.match(source,/avatar_url/,'the directory must use the player profile photo');
assert.match(source,/swe4477-player-name/,'player names must receive the prominent name style');
assert.match(source,/scrollIntoView\(\{behavior:'smooth',block:'center'\}\)/,'alphabet navigation must jump to the selected player');
assert.ok(loader.includes("players-directory-nav-v4477.js?v=5000-fixed-player-tools"),'the directory enhancement must load in the app');
console.log('players directory nav v4477: ok');


const test=require('node:test');
const {JSDOM}=require('jsdom');
test('player tools stay grouped and preserve editable fields while filtering and sorting',async()=>{
  const dom=new JSDOM('<div id="playersList"><div class="player"><div><span><b>Zoé</b></span></div><input value="note Zoé"></div><div class="player"><div><span><b>Alain</b></span></div><input value="note Alain"></div></div>',{runScripts:'outside-only'}),w=dom.window;
  w.S={players:[{id:'z',name:'Zoé'},{id:'a',name:'Alain'}]};
  w.eval(source);await new Promise(resolve=>w.setTimeout(resolve,400));
  const tools=w.document.querySelector('#swe4477PlayerTools'),input=w.document.querySelector('.player input');
  assert.ok(tools,'the complete tools block is mounted');
  assert.match(w.document.querySelector('style').textContent,/position:sticky/);
  assert.match(w.document.querySelector('style').textContent,/z-index:35/);
  assert.equal(tools.querySelector('#swe4477PlayerAlphabet')!==null,true);
  w.document.querySelector('#swe4477PlayerSort').value='desc';w.document.querySelector('#swe4477PlayerSort').dispatchEvent(new w.Event('change'));
  assert.equal(w.document.body.contains(input),true,'sorting moves existing cards instead of rebuilding note inputs');
  assert.equal(input.value,'note Alain','the unsaved note value is preserved');
  const search=w.document.querySelector('#swe4477PlayerSearch');search.value='alain';search.dispatchEvent(new w.Event('input'));
  assert.equal(w.document.querySelector('[data-player-id="z"]').classList.contains('swe4477-search-hidden'),true);
  assert.equal(w.document.querySelector('[data-player-id="a"]').classList.contains('swe4477-search-hidden'),false);
});
