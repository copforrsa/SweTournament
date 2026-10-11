import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transformApp,transformHtml} from './transform.mjs';
test('native package shares public HTTPS links and disables PWA worker',()=>{
 const source="const APP_URL=location.origin+location.pathname.substring(0,location.pathname.lastIndexOf('/')+1);if('serviceWorker' in navigator){x()}";
 const result=transformApp(source);assert.match(result,/APP_URL='https:\/\/app.swetournament.fr\/'/);assert.match(result,/!window.Capacitor\?\.isNativePlatform/);
});
test('Supabase CDN is replaced with an embedded dependency',()=>{
 const html='<head></head><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4"></script>';
 const result=transformHtml(html);assert.match(result,/mobile-vendor.js/);assert.match(result,/mobile-native.js/);assert.doesNotMatch(result,/cdn.jsdelivr/);
});
test('changed web structure fails instead of silently emitting broken links',()=>{assert.throws(()=>transformApp('changed source'),/marker changed/);});
