// Optional enhancements on top of the pre-rendered pages; the timetable itself is already in the HTML.
// Bundled after schedule-model.js by scripts/build.mjs. Keep to ES2017 syntax (no optional chaining or nullish coalescing) for older phones.
const root=document.documentElement,page=root.getAttribute('data-page');
const $=(selector,el)=>(el||document).querySelector(selector);
const $$=(selector,el)=>Array.prototype.slice.call((el||document).querySelectorAll(selector));
const store={get(key){try{return localStorage.getItem('jadwaly-public:'+key);}catch(e){return null;}},set(key,value){try{localStorage.setItem('jadwaly-public:'+key,String(value));}catch(e){}}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
function toast(message){const t=$('#toast');clearTimeout(toastTimer);t.textContent=message;t.classList.add('visible');toastTimer=setTimeout(()=>t.classList.remove('visible'),3500);}

// Theme: the inline head script already applied the saved choice before first paint.
const media=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
const validTheme=value=>['light','dark','system'].indexOf(value)>=0?value:'light';
let preference=validTheme(store.get('theme'));
function applyTheme(){
  const resolved=preference==='system'?(media&&media.matches?'dark':'light'):preference;
  root.setAttribute('data-theme',resolved);root.style.colorScheme=resolved;
  $('meta[name="theme-color"]').setAttribute('content',resolved==='dark'?'#0B171B':'#f7f8f4');
  $$('input[name="appearance"]').forEach(input=>{input.checked=input.value===preference;});
}
if(media&&media.addEventListener)media.addEventListener('change',()=>{if(preference==='system')applyTheme();});
window.addEventListener('storage',e=>{if(e.key==='jadwaly-public:theme'||e.key===null){preference=validTheme(e.key===null?null:e.newValue);applyTheme();}});
$$('input[name="appearance"]').forEach(input=>input.addEventListener('change',()=>{if(input.checked){preference=validTheme(input.value);store.set('theme',preference);applyTheme();}}));
applyTheme();

const settings=$('#settings');
function openDialog(dialog){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}
function closeDialog(dialog){if(dialog.close)dialog.close();else dialog.removeAttribute('open');}
$('#open-settings').addEventListener('click',()=>{applyTheme();openDialog(settings);});
$('#close-settings').addEventListener('click',()=>closeDialog(settings));
function closeOnBackdrop(dialog){dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);});}
closeOnBackdrop(settings);

function offline(){$('#offline').hidden=navigator.onLine!==false;}
window.addEventListener('online',offline);window.addEventListener('offline',offline);offline();

const lastGroup=parseGroup(store.get('lastGroup'));
if(page==='home'){
  // Valid ?group= links were redirected before paint; anything left over is invalid.
  if(new URLSearchParams(location.search).has('group')){history.replaceState(null,'',location.pathname+location.hash);toast('اختار مجموعة من ١ إلى ١٢.');}
  if(lastGroup){
    const tile=$(`.group-tile[data-group="${lastGroup}"]`);if(tile)tile.classList.add('last');
    const link=$('.last-group-link');link.href=`/group/${lastGroup}/`;link.textContent=`آخر اختيار: جروب ${ar(lastGroup)} ←`;link.hidden=false;
  }
}
if(page==='source'&&lastGroup){const back=$('.back-link');back.href=`/group/${lastGroup}/`;back.textContent=`→ رجوع لجدول جروب ${ar(lastGroup)}`;}
if(page==='group')groupPage(Number(root.getAttribute('data-group')));

function groupPage(group){
  store.set('lastGroup',group);
  const rows=$$('.session-row'),sections=$$('.day-section'),buttons=$$('.day-button'),search=$('#search');
  const data={sessions:rows.map(row=>({group,row,day:Number(row.dataset.day),start:Number(row.dataset.start),end:Number(row.dataset.end),kind:row.dataset.kind,title:row.dataset.title,room:row.dataset.room||null}))};
  let now=cairoNow(),show=root.getAttribute('data-show')||String(now.day),day=show==='all'?String(now.day):show,query='';
  function render(){
    const q=normalize(query.trim());
    root.setAttribute('data-show',q?'all':show);
    rows.forEach(row=>{row.hidden=!!q&&row.dataset.search.indexOf(q)<0;});
    sections.forEach(section=>{section.hidden=!!q&&!$('.session-row:not([hidden])',section);});
    $('#no-results').hidden=!q||rows.some(row=>!row.hidden);$('#no-results-query').textContent=query.trim();
    buttons.forEach(b=>{const selected=!q&&b.dataset.day===show;b.classList.toggle('selected',selected);b.classList.toggle('today',Number(b.dataset.day)===now.day);b.setAttribute('aria-pressed',String(selected));});
    $('#all-week').setAttribute('aria-pressed',String(!q&&show==='all'));
  }
  function setShow(value){show=value;if(value!=='all')day=value;query='';search.value='';render();}
  function tick(){
    now=cairoNow();
    const next=nextSession(data,group,now),slot=$('#next-card');
    slot.innerHTML=next?`<section class="next-bar ${next.live?'is-now':''}" aria-label="الموعد القادم"><span class="next-indicator">${next.live?'دلوقتي':'القادم'}</span><div><strong>${esc(next.session.title)}</strong><p>${days[next.session.day]} · ${time(next.session.start)}–${time(next.session.end)} · <bdi>${next.session.room?esc(next.session.room):'المكان غير مذكور'}</bdi></p></div><span class="kind-label ${next.session.kind}">${next.session.kind==='lecture'?'محاضرة':'سكشن'}</span></section>`:'';
    data.sessions.forEach(s=>{$('.live-note',s.row).hidden=!(s.day===now.day&&now.minutes>=s.start&&now.minutes<s.end);});
    render();
  }
  // Tapping a session opens its details; the card itself already shows the essentials without JavaScript.
  const details=$('#details');
  closeOnBackdrop(details);
  $('#close-details').addEventListener('click',()=>closeDialog(details));
  function showDetails(s){
    const info=s.row.dataset,kind=s.kind==='lecture'?'محاضرة':'سكشن';
    details.dataset.course=$('.session-card',s.row).dataset.course;
    $('#dialog-body').innerHTML=`<div class="dialog-kicker">${kind} · جروب ${ar(group)} · ${days[s.day]}</div><h2 class="dialog-title" id="dialog-title">${esc(s.title)}</h2><p class="detail-english" lang="en" dir="ltr">${esc(info.english)}</p><div class="detail-grid"><div class="detail-row"><span>التوقيت</span><strong>${time(s.start)} – ${time(s.end)}</strong></div><div class="detail-row"><span>المُحاضر</span><strong dir="ltr" lang="en">${esc($('.teacher',s.row).textContent)}</strong></div><div class="detail-row"><span>المكان</span><strong>${s.room?`<bdi>${esc(s.room)}</bdi>${s.room==='OL'?' · كما ورد في الملف':''}`:'غير مذكور في المصدر'}</strong></div></div>${info.issue?`<p class="source-warning">${esc(info.issue)}</p>`:''}${info.clarification?`<p class="detail-source">${esc(info.clarification)}</p>`:''}<div class="detail-source">كل المواعيد بتوقيت القاهرة.<a href="/timetable-2026-2027.pdf" target="_blank" rel="noopener">راجع الموعد في الملف الأصلي ↗</a></div>`;
    openDialog(details);
  }
  data.sessions.forEach(s=>{
    const card=$('.session-card',s.row);
    card.setAttribute('role','button');card.tabIndex=0;
    card.setAttribute('aria-label',`تفاصيل ${s.kind==='lecture'?'محاضرة':'سكشن'} ${s.title} يوم ${days[s.day]} ${time(s.start)}`);
    card.addEventListener('click',()=>showDetails(s));
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showDetails(s);}});
  });
  buttons.forEach(b=>{b.setAttribute('role','button');b.addEventListener('click',e=>{e.preventDefault();setShow(b.dataset.day);});});
  $('#all-week').addEventListener('click',()=>setShow(show==='all'?day:'all'));
  $$('.show-week').forEach(b=>b.addEventListener('click',()=>setShow('all')));
  search.addEventListener('input',()=>{query=search.value;render();});
  $('#clear-search').addEventListener('click',()=>{query='';search.value='';render();search.focus();});
  $('.print-button').addEventListener('click',()=>{setShow('all');window.print();});
  $('.share-button').addEventListener('click',()=>{
    const url=`${location.origin}/group/${group}/`,title=`جدولي — جروب ${ar(group)}`;
    const failed=e=>{if(!e||e.name!=='AbortError')toast('تعذّرت المشاركة. تقدر تنسخ الرابط من شريط العنوان.');};
    if(navigator.share)navigator.share({title,text:'جدول تكنولوجيا علوم البيانات · الفرقة الأولى · الترم الأول ٢٠٢٦ / ٢٠٢٧',url}).catch(failed);
    else if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>toast('اتنسخ رابط مجموعتك.'),failed);
    else window.prompt('انسخ رابط مجموعتك:',url);
  });
  tick();
  setInterval(()=>{if(!document.hidden)tick();},30000);
  if(show!=='all'){const selected=$('.day-button.selected');if(selected&&selected.scrollIntoView)selected.scrollIntoView({block:'nearest',inline:'center'});}
}

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
