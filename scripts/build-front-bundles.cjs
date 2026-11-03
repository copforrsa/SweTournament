'use strict';
/* Build the ordered classic-script bundles, preserving each original source for maintenance.
   Usage: node scripts/build-front-bundles.cjs [--check] */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/generated/swe-bundle-manifest-r550.json'),'utf8'));
const check=process.argv.includes('--check');
const groups=[manifest.pre,...manifest.runtime];
if(groups.length!==4 || groups.reduce((total,group)=>total+group.length,0)!==57)throw Error('Invalid SWÉ bundle manifest');
groups.forEach((group,i)=>{
 const header=i===0
  ?'/* SWÉ build 2026-11-03 — scripts pré-app regroupés dans leur ordre d\'origine. Ne pas éditer : sources préservées dans le dépôt. */\n'
  :'/* SWÉ consolidated runtime R550 — segment '+i+'/3. Original files retained for rollback. */\n';
 const body=header+group.map(file=>'\n;\n/* SOURCE '+file+' */\n'+fs.readFileSync(path.join(root,file),'utf8')).join('\n;\n');
 const output=path.join(root,manifest.outputs[i]);
 if(check){
   if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==body)throw Error('Bundle outdated: '+manifest.outputs[i]+' — run node scripts/build-front-bundles.cjs');
 }else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,body)}
});
console.log(check?'All SWÉ bundles match their sources':'All SWÉ bundles regenerated');
