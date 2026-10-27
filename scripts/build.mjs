// Generates the static site in dist/: a pre-rendered page per group, plus home, source and 404 pages.
// Every timetable entry is written into the HTML, so pages work before (and without) any JavaScript.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {days,weekOrder,ar,sessionsFor,time,searchText} from '../src/schedule-model.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'dist');
const SITE='https://gadwlys.vercel.app';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data/timetable.json'),'utf8'));
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex').slice(0,10);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function write(rel,content){const file=path.join(OUT,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}

fs.rmSync(OUT,{recursive:true,force:true});
fs.cpSync(path.join(ROOT,'site'),OUT,{recursive:true});

// One stylesheet with the WOFF2 fonts, plus the day filter that works before the script loads.
const dayFilter=[0,1,2,3,4,5,6].map(d=>`html[data-show="${d}"] .day-section:not([data-day="${d}"])`).join(',')+'{display:none}';
const css=['portal','simple','settings','static'].map(name=>read(`src/styles/${name}.css`)).join('\n')
  .replace("url('./fonts/IBMPlexSansArabic-Regular.ttf') format('truetype')","url('/fonts/ibm-plex-sans-arabic-400.woff2') format('woff2')")
  .replace("url('./fonts/IBMPlexSansArabic-SemiBold.ttf') format('truetype')","url('/fonts/ibm-plex-sans-arabic-600.woff2') format('woff2')")+'\n'+dayFilter+'\n';
if(css.includes('.ttf'))throw new Error('A font URL was not rewritten');
const cssFile=`/assets/app.${hash(css)}.css`;
write(cssFile,css);

// One classic script: the shared model with its exports stripped, then the page script.
const model=read('src/schedule-model.js').replace(/^export /gm,'');
if(/^import /m.test(model))throw new Error('schedule-model.js must not import anything');
const js=`(function(){\n${model}\n${read('src/app.js')}\n})();\n`;
const jsFile=`/assets/app.${hash(js)}.js`;
write(jsFile,js);

// Runs before first paint: legacy ?group= links, saved theme, and which day to show (ES5 on purpose).
const BOOT=`(function(d,l){var q=l.search.match(/[?&]group=(1[0-2]|[1-9])(&|$)/),p='light',t,n;if(d.getAttribute('data-page')==='home'){if(q){l.replace('/group/'+q[1]+'/'+l.hash);return}if(l.hash==='#source'){l.replace('/source/');return}}try{p=localStorage.getItem('jadwaly-public:theme')}catch(e){}if(p!=='dark'&&p!=='system')p='light';t=p==='dark'||(p==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';d.setAttribute('data-theme',t);d.style.colorScheme=t;if(t==='dark'){n=document.querySelector('meta[name="theme-color"]');if(n)n.setAttribute('content','#0B171B')}if(!('noModule'in document.createElement('script')))return;d.className+=' js';if(d.getAttribute('data-page')!=='group')return;try{n=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Cairo',weekday:'short'}).format(new Date()))}catch(e){n=-1}if(n<0)n=new Date().getDay();d.setAttribute('data-today',n);d.setAttribute('data-show',/^#day-[0-6]$/.test(l.hash)?l.hash.slice(5):l.hash==='#week'?'all':String(n))})(document.documentElement,location);`;
// Marks the selected and today's day buttons as soon as the strip is parsed.
const MARK=`(function(d){var s=d.getAttribute('data-show'),t=d.getAttribute('data-today'),b=document.querySelectorAll('.day-button'),i,x;if(!s)return;for(i=0;i<b.length;i++){x=b[i].getAttribute('data-day');if(x===s)b[i].className+=' selected';if(x===t)b[i].className+=' today'}})(document.documentElement);`;

const paths={share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 11 6-4m-6 6 6 4"/>',print:'<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 13h12v8H6Z"/>',check:'<path d="m5 12 4 4L19 6"/>',file:'<path d="M14 2H5v20h14V7Zm0 0v5h5M8 12h8m-8 4h6"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'};
const icon=name=>`<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
const kindLabel=s=>s.kind==='lecture'?'محاضرة':'سكشن';
function typesSummary(list){const l=list.filter(s=>s.kind==='lecture').length,p=list.length-l;const word=(n,one,two,many)=>n===1?one:n===2?two:`${ar(n)} ${many}`;return [l?word(l,'محاضرة','محاضرتان','محاضرات'):'',p?word(p,'سكشن','سكشنان','سكاشن'):''].filter(Boolean).join(' · ');}

function layout({page,group,pathName,title,description,shareTitle,main}){
  const image=`${SITE}/share-preview-v1.png`;
  return `<!doctype html>
<html lang="ar" dir="rtl" data-page="${page}"${group?` data-group="${group}"`:''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f7f8f4">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${pathName}">
  <script>${BOOT}</script>
  <link rel="stylesheet" href="${cssFile}">
  <script defer src="${jsFile}"></script>
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ar_EG">
  <meta property="og:site_name" content="جدولي">
  <meta property="og:title" content="${esc(shareTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${SITE}${pathName}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="جدولي — شعار الجدول وعلامة الصح بالتركواز والبرتقالي على خلفية داكنة">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(shareTitle)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="شعار جدولي — محاضراتك وسكاشنك في مكان واحد">
</head>
<body>
  <a class="skip-link" href="#main">انتقل للمحتوى</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="جدولي، اختيار المجموعة"><span class="brand-identity"><img class="brand-logotype logo-light" src="/jadwaly-logo-light.svg" width="138" height="54" alt=""><img class="brand-logotype logo-dark" src="/jadwaly-logo-dark.svg" width="138" height="54" alt=""><span class="brand-sub">تكنولوجيا علوم البيانات · HITU</span></span></a>
      <nav class="header-links" aria-label="التنقل"><a href="/">المجموعات</a><a href="/source/">عن الجدول</a></nav>
      <div class="header-tools"><a class="button button-small button-outline source-top" href="/timetable-2026-2027.pdf" target="_blank" rel="noopener">جدول الجامعة <span aria-hidden="true">↗</span></a><button class="settings-trigger js-only" id="open-settings" type="button" aria-label="الإعدادات" aria-haspopup="dialog"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/></svg></button></div>
    </div>
  </header>
  <div id="offline" class="offline" hidden>أنت غير متصل. المعروض هو آخر نسخة محفوظة على جهازك.</div>
  <main id="main" tabindex="-1">${main}</main>
  <footer class="site-footer"><p>الفرقة الأولى · الترم الأول ٢٠٢٦ / ٢٠٢٧</p><a href="/source/">المصدر والتوضيحات ↗</a></footer>
  ${page==='group'?'<dialog id="details" aria-labelledby="dialog-title"><button class="dialog-close" id="close-details" type="button" aria-label="إغلاق التفاصيل">×</button><div id="dialog-body"></div></dialog>':''}
  <dialog id="settings" class="settings-dialog" aria-labelledby="settings-title">
    <button class="dialog-close" id="close-settings" type="button" aria-label="إغلاق الإعدادات">×</button>
    <h2 id="settings-title">الإعدادات</h2>
    <fieldset class="theme-fieldset"><legend>مظهر الموقع</legend><div class="theme-options">
      <label class="theme-choice"><input type="radio" name="appearance" value="light"><span>فاتح</span></label>
      <label class="theme-choice"><input type="radio" name="appearance" value="dark"><span>داكن</span></label>
      <label class="theme-choice"><input type="radio" name="appearance" value="system"><span>حسب الجهاز</span></label>
    </div><p class="theme-hint">اختيارك بيتحفظ على جهازك.</p></fieldset>
    <section class="settings-credit" aria-label="صانع الموقع" lang="en" dir="ltr"><p>Made by <strong>Seif Ashraf</strong></p><div class="credit-links"><a href="https://seifashraf.dev" target="_blank" rel="noopener noreferrer">seifashraf.dev <span aria-hidden="true">↗</span></a><a href="https://github.com/darkxgs" target="_blank" rel="noopener noreferrer">GitHub · darkxgs <span aria-hidden="true">↗</span></a></div></section>
  </dialog>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

function sessionRow(s){
  const c=data.courses[s.course];
  const notes=[
    s.issue&&`<p class="card-warning">⚠ ${esc(s.issue)}</p>`,
    s.clarification&&`<p class="card-note">${esc(s.clarification)}</p>`,
    s.room==='OL'&&'<p class="card-note">الكود <bdi>OL</bdi> منقول كما هو في ملف الجامعة.</p>'
  ].filter(Boolean).join('');
  return `<div class="session-row" data-day="${s.day}" data-start="${s.start}" data-end="${s.end}" data-kind="${s.kind}" data-title="${esc(c.title)}" data-english="${esc(c.english)}" data-room="${esc(s.room||'')}"${s.issue?` data-issue="${esc(s.issue)}"`:''}${s.clarification?` data-clarification="${esc(s.clarification)}"`:''} data-search="${esc(searchText(data,s))}"><div class="session-time">${time(s.start)}<small>إلى ${time(s.end)}</small></div><article class="session-card ${s.kind}" data-course="${s.course}"><div class="session-card-top"><h3>${esc(c.title)}</h3><span class="kind-label ${s.kind}">${kindLabel(s)}</span></div><div class="session-meta"><span class="teacher" lang="en" dir="ltr">${esc(s.teacher)}</span><span class="room ${s.room?'':'unknown-room'}"><span dir="${s.room?'ltr':'rtl'}">${s.room?esc(s.room):'المكان غير مذكور'}</span></span></div>${notes}<span class="live-note" hidden>شغّالة دلوقتي</span></article></div>`;
}

function daySection(group,d){
  const list=sessionsFor(data,group,d);
  const body=list.length?list.map(sessionRow).join(''):`<div class="empty"><div class="empty-symbol" aria-hidden="true">${icon('sun')}</div><h3>يوم إجازة</h3><p>مفيش محاضرات أو سكاشن يوم ${days[d]} في الجدول.</p><button class="button button-outline show-week js-only" type="button">شوف باقي الأسبوع ←</button></div>`;
  return `<section class="day-section" id="day-${d}" data-day="${d}" aria-labelledby="day-${d}-title"><div class="day-heading"><h2 id="day-${d}-title">${days[d]}</h2><span>${list.length?typesSummary(list):'إجازة'}</span></div>${body}</section>`;
}

function groupPage(group){
  const name=`جروب ${ar(group)}`;
  const main=`<div class="container dashboard"><div class="dashboard-title"><div><h1>${name}</h1><p>الفرقة الأولى · الترم الأول</p></div><div class="title-actions"><a class="button button-small button-outline" href="/">تغيير الجروب</a><button class="button button-small button-outline share-button js-only" type="button" aria-label="مشاركة رابط ${name}">${icon('share')}</button><button class="button button-small button-outline print-button js-only" type="button" aria-label="طباعة جدول الأسبوع">${icon('print')}</button></div></div><p class="print-title">جدولي · ${name} · الفرقة الأولى · الترم الأول ٢٠٢٦ / ٢٠٢٧ · بتوقيت القاهرة</p><div id="next-card" class="js-only"></div><section class="schedule-main" aria-label="المحاضرات والسكاشن"><nav class="day-strip" aria-label="أيام الأسبوع">${weekOrder.map(d=>`<a class="day-button" href="#day-${d}" data-day="${d}">${days[d]}</a>`).join('')}</nav><script>${MARK}</script><div class="toolbar js-only"><label class="search-wrap">${icon('search')}<input id="search" type="search" placeholder="ابحث عن مادة أو قاعة" aria-label="ابحث في جدول المجموعة" autocomplete="off"></label><button class="view-toggle" id="all-week" type="button" aria-pressed="false">كل الأسبوع</button></div><div id="schedule-results">${weekOrder.map(d=>daySection(group,d)).join('')}<div class="no-results" id="no-results" hidden><h3>مفيش نتائج لـ «<span id="no-results-query"></span>»</h3><p>جرّب اسم المادة بالعربي أو الإنجليزي، أو كود القاعة.</p><button class="text-button" id="clear-search" type="button">مسح البحث</button></div></div><p class="sub-note">كل المواعيد بتوقيت القاهرة.</p></section></div>`;
  return layout({page:'group',group,pathName:`/group/${group}/`,title:`جدولي — ${name} | علوم البيانات`,shareTitle:`جدولي — ${name}`,description:`محاضرات وسكاشن ${name}، الفرقة الأولى، تكنولوجيا علوم البيانات، الترم الأول ٢٠٢٦ / ٢٠٢٧: المواعيد والقاعات والمحاضرين.`,main});
}

function homePage(){
  const main=`<div class="container simple-home"><section class="groups-panel" id="groups" aria-labelledby="groups-title"><div class="section-heading"><div><h1 id="groups-title">اختار مجموعتك</h1><p>الفرقة الأولى · الترم الأول · ٢٠٢٦ / ٢٠٢٧</p></div></div><div class="group-grid">${data.groups.map(g=>`<a class="group-tile" href="/group/${g}/" data-group="${g}" aria-label="افتح جدول جروب ${ar(g)}"><span>جروب</span><strong>${ar(g)}</strong></a>`).join('')}</div><a class="last-group-link" href="/" hidden></a><p class="simple-hint">اضغط على جروبك لعرض المحاضرات والسكاشن.</p></section></div>`;
  return layout({page:'home',pathName:'/',title:'جدولي — اختار مجموعتك',shareTitle:'جدولي — محاضراتك وسكاشنك في مكان واحد',description:'اختار مجموعتك وشوف المحاضرات والسكاشن ومواعيدها وقاعاتها. علوم البيانات — الفرقة الأولى — الترم الأول ٢٠٢٦ / ٢٠٢٧.',main});
}

function sourcePage(){
  const main=`<div class="container source-page"><a class="back-link" href="/">→ اختيار المجموعة</a><div class="eyebrow">المصدر والتوضيحات</div><h1>جدول واضح، ومصدره قدامك.</h1><p class="source-intro">الموقع يعرض بيانات الملف المرفق للمجموعات ١–١٢ فقط، مع مراعاة المواعيد المشتركة في الجدول وحدود كل مجموعة.</p><div class="source-layout"><section class="side-box"><h2>ملف جدول الجامعة</h2><p lang="en" dir="ltr">Helwan Int’l Technological University<br>Faculty of Technology in Cairo<br>Data Science Technology · Time Table 2026/2027</p><div class="source-details"><div>الفرقة<strong>الأولى</strong></div><div>الفصل الدراسي<strong>الأول · ٢٠٢٦ / ٢٠٢٧</strong></div><div>المجموعات<strong>١ إلى ١٢</strong></div><div>تاريخ مراجعة النقل<strong>٢٧ أكتوبر ٢٠٢٦</strong></div></div><p>الجدول من النسخة المرفقة لهذا الموقع. لا يوجد تحديث مباشر من الجامعة؛ أي إعلان أحدث منها هو المرجع.</p><a class="button" href="/timetable-2026-2027.pdf" target="_blank" rel="noopener">${icon('file')} افتح الملف الأصلي ↗</a><br><a class="text-button" href="/timetable-2026-2027.pdf" download="HITU-Data-Science-2026-2027.pdf">تنزيل نسخة PDF</a></section><section class="side-box"><h2>توضيحات على الملف</h2><p>موعدين يوم الخميس في الجدول حدودهم متداخلة مع صفوف الساعات. المواعيد التالية مُثبتة وفق توضيح صاحب النسخة، وليست إعلانًا جديدًا من الجامعة:</p><div class="issue-item"><strong>جروب ١ · تكنولوجيا المعلومات</strong><p>الخميس · ١٠:٠٠–١١:٠٠ صباحًا<br><bdi>Eng. Shimaa · G106</bdi></p></div><div class="issue-item"><strong>جروب ٦ · الإحصاء</strong><p>الخميس · ١١:٣٠ صباحًا–١٢:٣٠ ظهرًا<br><bdi>Eng. Shahd Yehia · G105</bdi></p></div><p>محاضرة الفيزياء يوم الأحد ٥–٦ مساءً للمجموعات ١–٦ لا تذكر قاعة. الكود <bdi>OL</bdi> في محاضرة تكنولوجيا المعلومات للمجموعات ١–٤ منقول كما هو في المصدر.</p><div class="issue-item"><strong>جروب ٣ وجروب ٦ · سكشن الفيزياء</strong><p>السبت · ٣:٠٠–٤:٠٠ مساءً<br>الملف كاتب <bdi>Eng. Aya Gamal</bdi> في القاعتين <bdi>G106</bdi> و<bdi>G105</bdi> في نفس الموعد. غالبًا فيه خطأ في واحد منهم؛ اتأكد من الكلية.</p></div></section></div><div class="help-item"><span class="help-icon">${icon('check')}</span><div><h3>خصوصيتك بسيطة</h3><p>مفيش تسجيل حساب أو درجات أو ملاحظات شخصية. آخر مجموعة اخترتها بتتحفظ في متصفحك فقط، ومش بتتبعت لطالب تاني.</p></div></div></div>`;
  return layout({page:'source',pathName:'/source/',title:'جدولي — المصدر والتوضيحات',shareTitle:'جدولي — المصدر والتوضيحات',description:'مصدر جدول تكنولوجيا علوم البيانات ٢٠٢٦ / ٢٠٢٧ والتوضيحات على ملف الجامعة.',main});
}

function notFoundPage(){
  const main=`<div class="container source-page"><div class="eyebrow">٤٠٤</div><h1>الصفحة دي مش موجودة.</h1><p class="source-intro">يمكن الرابط قديم أو فيه غلط.</p><a class="button" href="/">اختار مجموعتك</a></div>`;
  return layout({page:'404',pathName:'/404.html',title:'جدولي — الصفحة مش موجودة',shareTitle:'جدولي',description:'الصفحة المطلوبة مش موجودة.',main});
}

write('index.html',homePage());
for(const g of data.groups)write(`group/${g}/index.html`,groupPage(g));
write('source/index.html',sourcePage());
write('404.html',notFoundPage());
const pages=['/','/source/',...data.groups.map(g=>`/group/${g}/`)];
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p=>`  <url><loc>${SITE}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
const precache=['/',cssFile,jsFile];
write('sw.js',read('src/sw.js').replace('__VERSION__',hash(css+js+precache.join())).replace('__PRECACHE__',JSON.stringify(precache)));
console.log(`Built ${pages.length} pages into dist/ (${cssFile}, ${jsFile})`);
