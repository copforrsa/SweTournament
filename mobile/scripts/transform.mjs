export function transformApp(source) {
  const marker = "const APP_URL=location.origin+location.pathname.substring(0,location.pathname.lastIndexOf('/')+1);";
  if (!source.includes(marker)) throw new Error('Public link origin marker changed');
  return source.replace(marker, "const APP_URL='https://app.swetournament.fr/';")
    .replace("if('serviceWorker' in navigator){", "if(!window.Capacitor?.isNativePlatform()&&'serviceWorker' in navigator){");
}
export function transformHtml(source) {
  const cdn = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^" ]+"><\/script>/;
  return source.replace(cdn, '<script src="./mobile-vendor.js"></script>')
    .replace('</head>', '<script src="./mobile-native.js" defer></script></head>');
}
