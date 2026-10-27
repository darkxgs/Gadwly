import {days,weekOrder,ar,parseGroup,sessionsFor,cairoNow,nextSession,time,matches} from './schedule-model.js';
const main=document.querySelector('#main');
const dialog=document.querySelector('#details');
const settingsDialog=document.querySelector('#settings');
function syncThemeChoices(){document.querySelectorAll('input[name="appearance"]').forEach(input=>{input.checked=input.value===window.JadwalyTheme.getPreference();});}
document.querySelector('#open-settings').addEventListener('click',()=>{syncThemeChoices();settingsDialog.showModal();});
document.querySelector('#close-settings').addEventListener('click',()=>settingsDialog.close());
document.querySelectorAll('input[name="appearance"]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)window.JadwalyTheme.setPreference(input.value);}));
document.addEventListener('jadwaly-theme-change',syncThemeChoices);
settingsDialog.addEventListener('click',e=>{if(e.target===settingsDialog){const r=settingsDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)settingsDialog.close();}});
const paths={calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18m-12 4h1m5 0h1"/>',book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 11 6-4m-6 6 6 4"/>',print:'<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 13h12v8H6Z"/>',check:'<path d="m5 12 4 4L19 6"/>',arrow:'<path d="M19 12H5m6-6-6 6 6 6"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',file:'<path d="M14 2H5v20h14V7Zm0 0v5h5M8 12h8m-8 4h6"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'};
function icon(name){return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${paths[name]||paths.book}</svg>`;}
function countLabel(n){return n===1?'موعد واحد':n===2?'موعدان':`${ar(n)} ${n<11?'مواعيد':'موعدًا'}`;}
function kindLabel(s){return s.kind==='lecture'?'محاضرة':'سكشن';}
function typesSummary(list){const l=list.filter(s=>s.kind==='lecture').length,p=list.length-l;const word=(n,one,two,many)=>n===1?one:n===2?two:`${ar(n)} ${many}`;return [l?word(l,'محاضرة','محاضرتان','محاضرات'):'',p?word(p,'سكشن','سكشنان','سكاشن'):''].filter(Boolean).join(' · ');}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const store={get(key){try{return localStorage.getItem('jadwaly-public:'+key);}catch{return null;}},set(key,value){try{localStorage.setItem('jadwaly-public:'+key,String(value));}catch{}}};
let data,group=null,page='home',selectedDay=cairoNow().day,allWeek=false,query='',toastTimer;
function groupURL(g,tab='today'){const u=new URL('./',location.href);if(g)u.searchParams.set('group',g);u.hash=tab;return u.pathname+u.search+u.hash;}
function toast(message){clearTimeout(toastTimer);const t=document.querySelector('#toast');t.textContent=message;t.classList.add('visible');toastTimer=setTimeout(()=>t.classList.remove('visible'),3500);}
function setRoute(g,tab='today'){history.pushState({},'',groupURL(g,tab));route(true);}
function route(scroll=false){
  const params=new URLSearchParams(location.search);group=parseGroup(params.get('group'));
  if(params.has('group')&&!group){const u=new URL(location.href);u.searchParams.delete('group');history.replaceState({},'',u);toast('اختار مجموعة من ١ إلى ١٢.');}
  const hash=location.hash.slice(1);page=hash==='source'?'source':group?(hash==='week'?'week':'today'):'home';
  query='';allWeek=false;selectedDay=cairoNow().day;
  if(group)store.set('lastGroup',group);
  document.title=group?`جدولي — جروب ${ar(group)} | علوم البيانات`:'جدولي — اختار مجموعتك';
  document.querySelector('#source-link').href=groupURL(group,'source');
  document.querySelector('#footer-source').href=groupURL(group,'source');
  render();if(scroll)window.scrollTo({top:0,behavior:'instant'});
}
function render(){
  if(!data)return;
  main.innerHTML=page==='home'?landing():page==='source'?sourcePage():dashboard();
  bind();
}
function landing(){
  const last=parseGroup(store.get('lastGroup'));
  return `<div class="container simple-home"><section class="groups-panel" id="groups" aria-labelledby="groups-title"><div class="section-heading"><div><h1 id="groups-title">اختار مجموعتك</h1><p>الفرقة الأولى · الترم الأول · ٢٠٢٦ / ٢٠٢٧</p></div></div><div class="group-grid">${data.groups.map(g=>`<a class="group-tile ${last===g?'last':''}" href="${groupURL(g)}" data-group="${g}" aria-label="افتح جدول جروب ${ar(g)}"><span>جروب</span><strong>${ar(g)}</strong></a>`).join('')}</div>${last?`<a class="last-group-link" href="${groupURL(last)}" data-group="${last}">آخر اختيار: جروب ${ar(last)} ←</a>`:''}<p class="simple-hint">اضغط على جروبك لعرض المحاضرات والسكاشن.</p></section></div>`;
}
function dashboard(){
  const now=cairoNow();
  return `<div class="container dashboard"><div class="dashboard-title"><div><h1>جروب ${ar(group)}</h1><p>الفرقة الأولى · الترم الأول</p></div><div class="title-actions"><a class="button button-small button-outline" href="./" data-home>تغيير الجروب</a><button class="button button-small button-outline share-button" aria-label="مشاركة رابط جروب ${ar(group)}">${icon('share')}</button><button class="button button-small button-outline print-button" aria-label="طباعة جدول الأسبوع">${icon('print')}</button></div></div><p class="print-title">جدولي · جروب ${ar(group)} · الفرقة الأولى · الترم الأول ٢٠٢٦ / ٢٠٢٧ · بتوقيت القاهرة</p><div id="next-card">${nextCard()}</div><section class="schedule-main" aria-label="المحاضرات والسكاشن"><div class="day-strip" role="group" aria-label="اختر اليوم">${weekOrder.map(d=>`<button class="day-button ${selectedDay===d?'selected':''} ${now.day===d?'today':''}" data-day="${d}" aria-pressed="${selectedDay===d}">${days[d]}</button>`).join('')}</div><div class="toolbar"><label class="search-wrap">${icon('search')}<input id="search" type="search" placeholder="ابحث عن مادة أو قاعة" aria-label="ابحث في جدول المجموعة" value="${esc(query)}" autocomplete="off"></label><button class="view-toggle" id="all-week" aria-pressed="${allWeek}">كل الأسبوع</button></div><div id="schedule-results">${scheduleResults()}</div><p class="sub-note">كل المواعيد بتوقيت القاهرة.</p></section></div>`;
}
function nextCard(){
  const next=nextSession(data,group);if(!next)return '';
  const s=next.session,c=data.courses[s.course];
  return `<section class="next-bar ${next.live?'is-now':''}" aria-label="الموعد القادم"><span class="next-indicator">${next.live?'دلوقتي':'القادم'}</span><div><strong>${esc(c.title)}</strong><p>${days[s.day]} · ${time(s.start)}–${time(s.end)} · <bdi>${s.room?esc(s.room):'المكان غير مذكور'}</bdi></p></div><span class="kind-label ${s.kind}">${kindLabel(s)}</span></section>`;
}
function scheduleResults(){
  const ds=query.trim()||allWeek?weekOrder:[selectedDay];let count=0;
  const html=ds.map(d=>{
    const list=sessionsFor(data,group,d).filter(s=>matches(data,s,query));count+=list.length;
    if(query.trim()&&!list.length)return '';
    return `<section class="day-section"><div class="day-heading"><h2>${days[d]}</h2><span>${list.length?typesSummary(list):'إجازة'}</span></div>${list.length?list.map(sessionCard).join(''):`<div class="empty"><div class="empty-symbol" aria-hidden="true">${icon('sun')}</div><h3>يوم إجازة</h3><p>مفيش محاضرات أو سكاشن يوم ${days[d]} في الجدول.</p>${!allWeek?'<button class="button button-outline" id="show-week">شوف باقي الأسبوع ←</button>':''}</div>`}</section>`;
  }).join('');
  return count||!query.trim()?html:`<div class="no-results"><h3>مفيش نتائج لـ «${esc(query)}»</h3><p>جرّب اسم المادة بالعربي أو الإنجليزي، أو كود القاعة.</p><button class="text-button" id="clear-search">مسح البحث</button></div>`;
}
function sessionCard(s){
  const c=data.courses[s.course],now=cairoNow(),live=s.day===now.day&&s.start!==null&&now.minutes>=s.start&&now.minutes<s.end;
  return `<div class="session-row"><div class="session-time">${time(s.start)}<small>إلى ${time(s.end)}</small></div><button class="session-card ${s.kind}" data-course="${s.course}" data-session="${s.id}" aria-label="تفاصيل ${kindLabel(s)} ${esc(c.title)} يوم ${days[s.day]} ${time(s.start)}"><div class="session-card-top"><h3>${esc(c.title)}</h3><span class="kind-label ${s.kind}">${kindLabel(s)}</span></div><div class="session-meta"><span class="teacher" lang="en" dir="ltr">${esc(s.teacher)}</span><span class="room ${s.room?'':'unknown-room'}"><span dir="${s.room?'ltr':'rtl'}">${s.room?esc(s.room):'المكان غير مذكور'}</span></span></div>${live?'<span class="live-note">شغّالة دلوقتي</span>':''}</button></div>`;
}
function sourcePage(){
  const back=group?groupURL(group,'week'):'./';
  return `<div class="container source-page"><a class="back-link" href="${back}" ${group?'data-tab="week"':'data-home'}>→ ${group?'رجوع للجدول':'اختيار المجموعة'}</a><div class="eyebrow">المصدر والتوضيحات</div><h1>جدول واضح، ومصدره قدامك.</h1><p class="source-intro">الموقع يعرض بيانات الملف المرفق للمجموعات ١–١٢ فقط، مع مراعاة الخلايا المشتركة وحدود كل مجموعة.</p><div class="source-layout"><section class="side-box"><h2>ملف جدول الجامعة</h2><p lang="en" dir="ltr">Helwan Int’l Technological University<br>Faculty of Technology in Cairo<br>Data Science Technology · Time Table 2026/2027</p><div class="source-details"><div>الفرقة<strong>الأولى</strong></div><div>الفصل الدراسي<strong>الأول · ٢٠٢٦ / ٢٠٢٧</strong></div><div>المجموعات<strong>١ إلى ١٢</strong></div><div>تاريخ مراجعة النقل<strong>٢٧ أكتوبر ٢٠٢٦</strong></div></div><p>الجدول من النسخة المرفقة لهذا الموقع. لا يوجد تحديث مباشر من الجامعة؛ أي إعلان أحدث منها هو المرجع.</p><a class="button" href="./timetable-2026-2027.pdf" target="_blank" rel="noopener">${icon('file')} افتح الملف الأصلي ↗</a><br><a class="text-button" href="./timetable-2026-2027.pdf" download="HITU-Data-Science-2026-2027.pdf">تنزيل نسخة PDF</a></section><section class="side-box"><h2>توضيحات على الملف</h2><p>حدود خليتين يوم الخميس متداخلة مع صفوف الساعات. المواعيد التالية مُثبتة وفق توضيح صاحب النسخة، وليست إعلانًا جديدًا من الجامعة:</p><div class="issue-item"><strong>جروب ١ · تكنولوجيا المعلومات</strong><p>الخميس · ١٠:٠٠–١١:٠٠ صباحًا<br><bdi>Eng. Shimaa · G106</bdi></p></div><div class="issue-item"><strong>جروب ٦ · الإحصاء</strong><p>الخميس · ١١:٣٠ صباحًا–١٢:٣٠ ظهرًا<br><bdi>Eng. Shahd Yehia · G105</bdi></p></div><p>محاضرة الفيزياء يوم الأحد ٥–٦ مساءً للمجموعات ١–٦ لا تذكر قاعة. الكود <bdi>OL</bdi> في محاضرة تكنولوجيا المعلومات للمجموعات ١–٤ منقول كما هو في المصدر.</p></section></div><div class="help-item"><span class="help-icon">${icon('check')}</span><div><h3>خصوصيتك بسيطة</h3><p>مفيش تسجيل حساب أو درجات أو ملاحظات شخصية. آخر مجموعة اخترتها بتتحفظ في متصفحك فقط، ومش بتتبعت لطالب تاني.</p></div></div></div>`;
}
function showDetails(id){
  const s=data.sessions.find(s=>s.id===id&&s.group===group);if(!s)return;const c=data.courses[s.course];
  dialog.dataset.course=s.course;
  document.querySelector('#dialog-body').innerHTML=`<div class="dialog-kicker">${kindLabel(s)} · جروب ${ar(group)} · ${days[s.day]}</div><h2 class="dialog-title" id="dialog-title">${esc(c.title)}</h2><p class="detail-english" lang="en" dir="ltr">${esc(c.english)}</p><div class="detail-grid"><div class="detail-row"><span>التوقيت</span><strong>${s.start===null?'يحتاج تأكيدًا':`${time(s.start)} – ${time(s.end)}`}</strong></div><div class="detail-row"><span>المُحاضر</span><strong dir="ltr" lang="en">${esc(s.teacher)}</strong></div><div class="detail-row"><span>المكان</span><strong>${s.room?`<bdi>${esc(s.room)}</bdi>${s.room==='OL'?' · كما ورد في الملف':''}`:'غير مذكور في المصدر'}</strong></div></div>${s.issue?`<p class="source-warning">${esc(s.issue)}</p>`:''}${s.clarification?`<p class="detail-source">${esc(s.clarification)}</p>`:''}<div class="detail-source">كل المواعيد بتوقيت القاهرة.<a href="./timetable-2026-2027.pdf" target="_blank" rel="noopener">راجع الموعد في الملف الأصلي ↗</a></div>`;
  dialog.showModal();
}
function updateResults(){
  document.querySelector('#schedule-results').innerHTML=scheduleResults();
  document.querySelectorAll('.day-button').forEach(b=>{const selected=!allWeek&&!query&&Number(b.dataset.day)===selectedDay;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
  const toggle=document.querySelector('#all-week');toggle?.setAttribute('aria-pressed',allWeek);
  bindResults();
}
function bindResults(){
  main.querySelectorAll('[data-session]').forEach(b=>b.onclick=()=>showDetails(b.dataset.session));
  main.querySelector('#show-week')?.addEventListener('click',()=>{allWeek=true;updateResults();});
  main.querySelector('#clear-search')?.addEventListener('click',()=>{query='';document.querySelector('#search').value='';updateResults();document.querySelector('#search').focus();});
}
function bind(){
  main.querySelectorAll('[data-group]').forEach(a=>a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button)return;e.preventDefault();setRoute(Number(a.dataset.group));}));
  main.querySelectorAll('[data-home]').forEach(a=>a.addEventListener('click',goHome));
  main.querySelectorAll('[data-tab]').forEach(a=>a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button)return;e.preventDefault();setRoute(group,a.dataset.tab);}));
  main.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{selectedDay=Number(b.dataset.day);allWeek=false;query='';document.querySelector('#search').value='';updateResults();});
  main.querySelector('#search')?.addEventListener('input',e=>{query=e.target.value;updateResults();});
  main.querySelector('#all-week')?.addEventListener('click',()=>{allWeek=!allWeek;updateResults();});
  main.querySelector('.share-button')?.addEventListener('click',share);
  main.querySelector('.print-button')?.addEventListener('click',()=>{allWeek=true;query='';document.querySelector('#search').value='';updateResults();window.print();});
  bindResults();
  if(page==='week'&&!allWeek)requestAnimationFrame(()=>main.querySelector('.day-button.selected')?.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'}));
}
function goHome(e){if(e&&(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button))return;e?.preventDefault();history.pushState({},'','./');route(true);}
async function share(){
  const url=new URL(groupURL(group,'week'),location.href).href,title=`جدولي — جروب ${ar(group)}`;
  try{if(navigator.share){await navigator.share({title,text:'جدول تكنولوجيا علوم البيانات · الفرقة الأولى · الترم الأول ٢٠٢٦ / ٢٠٢٧',url});}else if(navigator.clipboard){await navigator.clipboard.writeText(url);toast('اتنسخ رابط مجموعتك.');}else{window.prompt('انسخ رابط مجموعتك:',url);}}catch(e){if(e.name!=='AbortError')toast('تعذّرت المشاركة. تقدر تنسخ الرابط من شريط العنوان.');}
}
document.querySelectorAll('.site-header [data-home]').forEach(a=>a.addEventListener('click',goHome));
document.querySelector('.brand').addEventListener('click',goHome);
document.querySelector('#source-link').addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button)return;e.preventDefault();setRoute(group,'source');});
document.querySelector('#footer-source').addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button)return;e.preventDefault();setRoute(group,'source');});
document.querySelector('.dialog-close').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('popstate',()=>route(true));
window.addEventListener('hashchange',()=>{if(location.hash==='#main'||(location.hash==='#groups'&&!group))return;route(false);});
function offline(){document.querySelector('#offline').hidden=navigator.onLine;}
window.addEventListener('online',offline);window.addEventListener('offline',offline);offline();
try{const response=await fetch('./timetable.json');if(!response.ok)throw new Error('Cannot load timetable');data=await response.json();route();}catch{main.innerHTML='<div class="loading"><h1>تعذّر تحميل الجداول</h1><p>راجع الاتصال وحاول تاني، أو افتح الملف الأصلي.</p><a class="button" href="./timetable-2026-2027.pdf">ملف الجدول</a><p><button class="text-button" id="reload">إعادة المحاولة</button></p></div>';document.querySelector('#reload').onclick=()=>location.reload();}
setInterval(()=>{if(document.hidden||!data||!group||page==='source'||dialog.open)return;const card=document.querySelector('#next-card');if(card)card.innerHTML=nextCard();if(!main.contains(document.activeElement))updateResults();},30000);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
