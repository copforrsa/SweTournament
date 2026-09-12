const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function build(root){
 const css=fs.readFileSync(path.join(root,'registration-preview.css'),'utf8'),js=fs.readFileSync(path.join(root,'registration-preview.js'),'utf8');
 const hash=crypto.createHash('sha256').update(js).digest('base64');
 return fs.readFileSync(path.join(root,'registration-preview.html'),'utf8')
  .replace(/<link rel="stylesheet"[^>]+>/,()=>'<style>'+css+'</style>')
  .replace(/\s*<script src="\.\/registration-preview\.js[^>]*><\/script>/,'')
  .replace("script-src 'self'",()=>"script-src 'sha256-"+hash+"'")
  .replace('</body>',()=>'<script>'+js+'</script></body>');
}
module.exports={build};
if(require.main===module){if(!process.argv[2])throw Error('Output path required');fs.writeFileSync(process.argv[2],build(path.resolve(__dirname,'..')));}
