(()=>{
  'use strict';

  const STYLE_ID='swe-v4224-hotfix-style';
  const css=`
/* V42.24 — Matchs lisibles, notes alignées, remplaçants repliables */
.swe-substitutes-card{margin-top:12px}.swe-substitutes-card>summary{cursor:pointer;list-style:none}.swe-substitutes-card>summary::-webkit-details-marker{display:none}.swe-substitutes-head span:first-child{display:flex;flex-direction:column;gap:2px}.swe-substitutes-head small{font-size:11px;font-weight:600;opacity:.78}.swe-substitutes-chevron{font-size:22px;line-height:1;transition:transform .18s ease}.swe-substitutes-card[open] .swe-substitutes-chevron{transform:rotate(180deg)}
.match-scoring-first{margin-top:10px;padding:12px;border:2px solid #dfe8e3;border-radius:14px;background:#fff}.match-scoring-title{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}.match-scoring-title span{font-size:12px;color:#69766f}.match-goal-form{margin-bottom:8px}.match-goal-add{width:100%;margin-bottom:7px}.match-goal-history{border-top:1px solid #edf1ef;padding-top:7px}.match-goal-history .row{padding:4px 0}
.match-ratings-card{margin-top:12px;border:1px solid #dce6e1;border-radius:12px;overflow:hidden;background:#fff}.match-ratings-title{font-weight:800;padding:10px 12px;background:#f6f9f7;border-bottom:1px solid #e6ede9}.match-ratings-table{width:100%}.match-ratings-head,.match-ratings-row{display:grid;grid-template-columns:minmax(120px,1fr) 72px 44px 36px 36px;gap:8px;align-items:center;padding:7px 12px}.match-ratings-head{font-size:11px;font-weight:800;color:#718078;background:#fbfcfb}.match-ratings-row{border-top:1px solid #edf2ef;font-size:13px}.match-ratings-row:first-of-type{border-top:0}.match-ratings-row>span:not(.match-rating-name),.match-ratings-row>strong{text-align:center}.match-rating-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.match-ratings-row strong{font-variant-numeric:tabular-nums}
@media(max-width:640px){.match-ratings-head,.match-ratings-row{grid-template-columns:minmax(105px,1fr) 66px 38px 30px 30px;padding-left:9px;padding-right:9px;gap:4px}.match-scoring-title{align-items:flex-start;flex-direction:column;gap:2px}.match-goal-form{grid-template-columns:1fr!important}.match-goal-add{margin-top:0}}
`;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=css;document.head.appendChild(s);
  }

  function setVersion(){window.SWEApplyBuild?.();}

  function foldSubstitutes(){
    document.querySelectorAll('.swe-substitutes-card:not(details)').forEach(card=>{
      const head=card.querySelector('.swe-substitutes-head');
      const list=card.querySelector('.swe-substitutes-list');
      if(!head||!list)return;
      const count=list.children.length;
      const details=document.createElement('details');
      details.className=card.className;
      const summary=document.createElement('summary');summary.className='swe-substitutes-head';
      summary.innerHTML='<span><b>🟠 Remplaçants communs</b><small>'+count+' joueur'+(count>1?'s':'')+' • toucher pour afficher</small></span><span class="swe-substitutes-chevron">⌄</span>';
      details.append(summary,list.cloneNode(true));
      card.replaceWith(details);
    });
  }

  function formatRatings(){
    document.querySelectorAll('.card.match').forEach(match=>{
      match.querySelectorAll('b').forEach(title=>{
        if(title.textContent.trim()!=='⭐ Notes des joueurs')return;
        const notes=title.parentElement;
        if(!notes||notes.classList.contains('match-ratings-card'))return;
        const source=notes.querySelector('.muted');
        if(!source)return;
        const lines=source.innerHTML.split(/<br\s*\/?\s*>/i).map(x=>x.trim()).filter(Boolean);
        const rows=[];
        for(const line of lines){
          const temp=document.createElement('div');temp.innerHTML=line;
          const text=temp.textContent.trim();
          const m=text.match(/^(.*?)\s+([0-9]+(?:[.,][0-9]+)?\/10)\s+\((.*?)\s+•\s+⚽\s*(\d+)\s+•\s+🎯\s*(\d+)\)$/);
          if(m)rows.push({name:m[1],note:m[2].replace(',','.'),result:m[3],goals:m[4],assists:m[5]});
        }
        if(!rows.length)return;
        notes.className='match-ratings-card';
        notes.removeAttribute('style');
        notes.innerHTML='<div class="match-ratings-title">⭐ Notes des joueurs</div><div class="match-ratings-table"><div class="match-ratings-head"><span>Joueur</span><span>Note</span><span>Rés.</span><span>⚽</span><span>🎯</span></div>'+rows.map(r=>'<div class="match-ratings-row"><span class="match-rating-name"></span><strong>'+r.note+'</strong><span>'+r.result+'</span><span>'+r.goals+'</span><span>'+r.assists+'</span></div>').join('')+'</div>';
        notes.querySelectorAll('.match-rating-name').forEach((el,i)=>{el.textContent=rows[i].name;});
      });
    });
  }

  function moveScoringFirst(){
    document.querySelectorAll('.card.match').forEach(match=>{
      if(match.querySelector(':scope > .match-scoring-first'))return;
      const buttons=[...match.querySelectorAll(':scope > button')];
      const add=buttons.find(b=>b.textContent.trim()==='+ But');
      if(!add)return;
      const form=add.previousElementSibling;
      const hist=add.nextElementSibling;
      if(!form||!form.matches('.grid.g3')||!hist)return;
      const wrap=document.createElement('div');wrap.className='match-scoring-first';
      const title=document.createElement('div');title.className='match-scoring-title';title.innerHTML='<b>⚽ Saisir un but / une passe</b><span>Action rapide pendant le match</span>';
      form.classList.add('match-goal-form');add.classList.add('match-goal-add');hist.classList.add('match-goal-history');hist.style.marginTop='';
      wrap.append(title,form,add,hist);
      const anchor=match.children[2]||null;
      match.insertBefore(wrap,anchor);
    });
  }

  let scheduled=false;
  function apply(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;installStyle();setVersion();foldSubstitutes();moveScoringFirst();formatRatings();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
