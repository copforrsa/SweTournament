'use strict';
// Close simulated browsers even when an assertion fails before explicit cleanup.
if(process.env.NODE_TEST_CONTEXT){
const {after}=require('node:test');
const jsdom=require('jsdom'),OriginalJSDOM=jsdom.JSDOM;
const windows=new Set();
jsdom.JSDOM=class extends OriginalJSDOM {
 constructor(...args){super(...args);windows.add(this.window)}
};
after(()=>{
 for(const window of windows)window.close();
 windows.clear();
});
}
