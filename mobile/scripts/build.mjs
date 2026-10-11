import {execFileSync} from 'node:child_process';
import {readFile,writeFile,rm,mkdir,copyFile} from 'node:fs/promises';
import {dirname,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {transformApp,transformHtml} from './transform.mjs';
const mobile=resolve(dirname(fileURLToPath(import.meta.url)),'..'),root=resolve(mobile,'..'),out=resolve(mobile,'www');
const files=execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
const extensions=new Set(['.html','.js','.css','.png','.jpg','.jpeg','.svg','.webp','.ico','.webmanifest','.woff','.woff2','.mp3']);
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const file of files){
 if(file.startsWith('.')||/^(mobile|tests|supabase)\//.test(file)||/\.test\.js$/.test(file)||!extensions.has(extname(file)))continue;
 const target=resolve(out,file);await mkdir(dirname(target),{recursive:true});
 if(file==='app.js')await writeFile(target,transformApp(await readFile(resolve(root,file),'utf8')));
 else if(extname(file)==='.html')await writeFile(target,transformHtml(await readFile(resolve(root,file),'utf8')));
 else await copyFile(resolve(root,file),target);
}
await build({stdin:{contents:"import * as supabase from '@supabase/supabase-js';window.supabase=supabase;",resolveDir:mobile},bundle:true,platform:'browser',format:'iife',outfile:resolve(out,'mobile-vendor.js')});
await build({entryPoints:[resolve(mobile,'src/native.js')],bundle:true,platform:'browser',format:'iife',outfile:resolve(out,'mobile-native.js')});
const html=await readFile(resolve(out,'index.html'),'utf8');
if(!html.includes('mobile-vendor.js')||html.includes('cdn.jsdelivr.net/npm/@supabase'))throw new Error('Supabase was not bundled');
await writeFile(resolve(out,'MOBILE_BUILD.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim(),appId:'fr.swetournament.app',version:'0.1.0'},null,2));
console.log('Mobile web resources built from tracked repository files.');
