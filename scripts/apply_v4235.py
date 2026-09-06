from pathlib import Path
import re

# Cohérence de version + chargement du nouveau hotfix event-driven.
p=Path('index.html'); s=p.read_text()
s=re.sub(r'V42\.\d+','V42.35',s)
s=re.sub(r'MAJ 42\.\d+','MAJ 42.35',s)
s=re.sub(r'styles\.css\?v=\d+','styles.css?v=4235',s)
s=re.sub(r'app\.js\?v=\d+','app.js?v=4235',s)
for n in ['4227','4228','4229','4230','4231','4232']:
    s=re.sub(fr'hotfix-v{n}\.js\?v=\d+',f'hotfix-v{n}.js?v=4235',s)
s=re.sub(r'ui-stability-v4234\.js\?v=\d+','ui-stability-v4234.js?v=4235',s)
if 'hotfix-v4235.js' not in s:
    s=s.replace('</body>','<script src="./hotfix-v4235.js?v=4235" defer></script></body>')
p.write_text(s)

for name in ['hotfix-v4227.js','hotfix-v4228.js','hotfix-v4229.js','hotfix-v4230.js','hotfix-v4231.js','hotfix-v4232.js','ui-stability-v4234.js']:
    p=Path(name); s=p.read_text(); s=re.sub(r"const VERSION='42\.\d+'","const VERSION='42.35'",s); p.write_text(s)

# Paiement : garder les désistements tardifs visibles mais hors compte payé/non payé.
p=Path('app.js'); s=p.read_text()
s=s.replace("const all=(snapshot.players||[]).filter(r=>r.present);\n    const confirmed=all.filter(r=>r.registration_status!=='waitlist'&&!r.is_substitute);",
            "const all=(snapshot.players||[]).filter(r=>r.present||r.registration_status==='late_withdrawal');\n    const confirmed=all.filter(r=>r.registration_status!=='waitlist'&&r.registration_status!=='late_withdrawal'&&!r.is_substitute);")
s=s.replace("const wait=r.registration_status==='waitlist';\n        const substitute=!!r.is_substitute;\n        const paid=!!r.manual_paid_at;",
            "const wait=r.registration_status==='waitlist';\n        const withdrawn=r.registration_status==='late_withdrawal';\n        const substitute=!!r.is_substitute;\n        const paid=!!r.manual_paid_at;")
s=s.replace("const d=document.createElement('div');d.className='player row';d.style.marginBottom='8px';d.style.gap='8px';d.style.flexWrap='wrap';\n        const audit=paid&&r.manual_paid_collector_name?'<div class=\"muted\" style=\"margin-top:3px\">Saisi par '+esc(r.manual_paid_collector_name)+' • '+esc(fmtDateTime(r.manual_paid_at))+'</div>':'';",
            "const d=document.createElement('div');d.className='player row';d.style.marginBottom='8px';d.style.gap='8px';d.style.flexWrap='wrap';if(withdrawn){d.style.opacity='.58';d.style.background='#f3f4f6'}\n        const audit=paid&&r.manual_paid_collector_name?'<div class=\"muted\" style=\"margin-top:3px\">Saisi par '+esc(r.manual_paid_collector_name)+' • '+esc(fmtDateTime(r.manual_paid_at))+'</div>':'';")
s=s.replace("d.innerHTML='<span style=\"flex:1;min-width:170px\"><b>'+esc(r.player_name||'Joueur')+'</b><div class=\"muted\" style=\"margin-top:3px\">'+(substitute?'🟠 Remplaçant':(wait?'⏳ Liste d’attente':'✅ Inscrit confirmé'))+' • '+esc(paymentMoney(price))+'</div>'+audit+'</span><span class=\"guest-badge\" style=\"background:'+(paid?'#e8f7ec':(wait?'#fff1d6':'#ffe9e7'))+';color:'+(paid?'#176a36':(wait?'#9a5b00':'#b3261e'))+'\">'+(paid?'PAYÉ':'NON PAYÉ')+'</span>';",
            "const statusText=withdrawn?'⚠️ Désistement de dernière minute':(substitute?'🟠 Remplaçant':(wait?'⏳ Liste d’attente':'✅ Inscrit confirmé'));const withdrawalInfo=withdrawn?'<div class=\"muted\" style=\"margin-top:3px\">Retiré de la feuille active'+(r.withdrawal_note?' • '+esc(r.withdrawal_note):'')+'</div>':'';d.innerHTML='<span style=\"flex:1;min-width:170px\"><b>'+esc(r.player_name||'Joueur')+'</b><div class=\"muted\" style=\"margin-top:3px\">'+statusText+(withdrawn?'':' • '+esc(paymentMoney(price)))+'</div>'+withdrawalInfo+audit+'</span><span class=\"guest-badge\" style=\"background:'+(withdrawn?'#e5e7eb':(paid?'#e8f7ec':(wait?'#fff1d6':'#ffe9e7')))+';color:'+(withdrawn?'#4b5563':(paid?'#176a36':(wait?'#9a5b00':'#b3261e')))+'\">'+(withdrawn?'DÉSISTEMENT':(paid?'PAYÉ':'NON PAYÉ'))+'</span>';")
s=s.replace("if(!wait){const b=document.createElement('button');","if(!wait&&!withdrawn){const b=document.createElement('button');")

# Le tarif sur place défini sur le tournoi prime sur l'ancien tarif générique du complexe.
s=s.replace('publicMoney(onsiteStandardPriceCents(regTour))','publicMoney(Number(regTour.onsite_entry_fee_cents??onsiteStandardPriceCents(regTour)))')
p.write_text(s)

# Cache propre, sans injection d'anciens scripts.
p=Path('sw.js'); sw=p.read_text()
sw=re.sub(r"const CACHE='[^']+';","const CACHE='swe-tournament-5v5-v42-35';",sw,1)
if "'./hotfix-v4235.js'" not in sw:
    sw=sw.replace("'./ui-stability-v4234.js'","'./ui-stability-v4234.js','./hotfix-v4235.js'")
p.write_text(sw)
