import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Share} from '@capacitor/share';
window.Capacitor=Capacitor;
if(Capacitor.isNativePlatform()){
 document.documentElement.classList.add('swe-native');
 navigator.share=async data=>{await Share.share({title:data.title,text:data.text,url:data.url,dialogTitle:'Partager SWÉ'});};
 App.addListener('backButton',async()=>{
  if(history.length>1)history.back();else await App.minimizeApp();
 });
}
