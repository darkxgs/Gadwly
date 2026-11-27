// Generates the static site in dist/: a pre-rendered page per group, plus home, source and 404 pages,
// in Arabic (/) and English (/en/).
// Every timetable entry is written into the HTML, so pages work before (and without) any JavaScript.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {days,daysEn,weekOrder,ar,sessionsFor,time,timeEn,searchText} from '../src/schedule-model.js';

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
const css=['portal','simple','settings','static','ltr'].map(name=>read(`src/styles/${name}.css`)).join('\n')
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


// Runs before first paint: language preference and legacy ?group= links (Arabic home only), saved theme, and which day to show (ES5 on purpose).
const BOOT=`(function(d,l){var q=l.search.match(/[?&]group=([1-7])(&|$)/),p='light',t,n,g='';try{g=localStorage.getItem('jadwaly-public:lang')}catch(e){}if(d.getAttribute('data-page')==='home'&&d.lang==='ar'){g=g==='en'?'/en':'';if(q){l.replace(g+'/group/'+q[1]+'/'+l.hash);return}if(l.hash==='#source'){l.replace(g+'/source/');return}if(g){l.replace('/en/'+l.search+l.hash);return}}try{p=localStorage.getItem('jadwaly-public:theme')}catch(e){}if(p!=='dark'&&p!=='system')p='light';t=p==='dark'||(p==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';d.setAttribute('data-theme',t);d.style.colorScheme=t;if(t==='dark'){n=document.querySelector('meta[name="theme-color"]');if(n)n.setAttribute('content','#0B171B')}if(!('noModule'in document.createElement('script')))return;d.className+=' js';if(d.getAttribute('data-page')!=='group')return;try{n=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Cairo',weekday:'short'}).format(new Date()))}catch(e){n=-1}if(n<0)n=new Date().getDay();d.setAttribute('data-today',n);q=(d.getAttribute('data-days')||'').split(',');t=/^#day-[0-6]$/.test(l.hash)?+l.hash.slice(5):n;for(p=0;p<7&&q.indexOf(String((t+p)%7))<0;p++);d.setAttribute('data-show',l.hash==='#week'?'all':String((t+p%7)%7))})(document.documentElement,location);`;
const MARK=`(function(d){var s=d.getAttribute('data-show'),t=d.getAttribute('data-today'),b=document.querySelectorAll('.day-button'),i,x;if(!s)return;for(i=0;i<b.length;i++){x=b[i].getAttribute('data-day');if(x===s)b[i].className+=' selected';if(x===t)b[i].className+=' today'}})(document.documentElement);`;

const paths={share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 11 6-4m-6 6 6 4"/>',print:'<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 13h12v8H6Z"/>',check:'<path d="m5 12 4 4L19 6"/>',file:'<path d="M14 2H5v20h14V7Zm0 0v5h5M8 12h8m-8 4h6"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'};
const icon=name=>`<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
// Days off (no sessions for the group) are left out of the page entirely.
const studyDays=group=>weekOrder.filter(d=>sessionsFor(data,group,d).length);

// Interface text. Course names, teachers and rooms on the English pages are exactly as printed in the university file.
const T={
  ar:{dir:'rtl',base:'',locale:'ar_EG',site:'جدولي',num:ar,days,time,
    skip:'انتقل للمحتوى',brandLabel:'جدولي، اختيار المجموعة',brandSub:'تكنولوجيا علوم البيانات · HITU',nav:'التنقل',groups:'المجموعات',about:'عن الجدول',pdf:'جدول الجامعة',
    other:{label:'English',lang:'en',dir:'ltr',title:'View this page in English'},settings:'الإعدادات',
    disclaimer:'⚠ تنبيه: الموقع ده مش تابع للجامعة ومالوش علاقة رسمية بيها. هو مجرد جدول لمساعدة الطلاب.',
    offline:'أنت غير متصل. المعروض هو آخر نسخة محفوظة على جهازك.',footer:'الفرقة الأولى · الترم الأول ٢٠٢٦ / ٢٠٢٧',footerLink:'المصدر والتوضيحات ↗',
    closeDetails:'إغلاق التفاصيل',closeSettings:'إغلاق الإعدادات',appearance:'مظهر الموقع',light:'فاتح',dark:'داكن',system:'حسب الجهاز',themeHint:'اختيارك بيتحفظ على جهازك.',maker:'صانع الموقع',whatsapp:'واتساب',
    imageAlt:'جدولي — شعار الجدول وعلامة الصح بالتركواز والبرتقالي على خلفية داكنة',twitterAlt:'شعار جدولي — محاضراتك وسكاشنك في مكان واحد',
    lecture:'محاضرة',section:'سكشن',to:'إلى',noRoom:'المكان غير مذكور',online:'أونلاين',liveNote:'شغّالة دلوقتي',
    summary(l,p){const word=(n,one,two,many)=>n===1?one:n===2?two:`${ar(n)} ${many}`;return [l?word(l,'محاضرة','محاضرتان','محاضرات'):'',p?word(p,'سكشن','سكشنان','سكاشن'):''].filter(Boolean).join(' · ');},
    dayOff:'إجازة',dayOffTitle:'يوم إجازة',dayOffText:d=>`مفيش محاضرات أو سكاشن يوم ${d} في الجدول.`,restOfWeek:'شوف باقي الأسبوع ←',
    group:g=>`جروب ${ar(g)}`,yearTerm:'الفرقة الأولى · الترم الأول',changeGroup:'تغيير الجروب',shareLabel:n=>`مشاركة رابط ${n}`,printLabel:'طباعة جدول الأسبوع',
    printTitle:n=>`جدولي · ${n} · الفرقة الأولى · الترم الأول ٢٠٢٦ / ٢٠٢٧ · بتوقيت القاهرة`,scheduleLabel:'المحاضرات والسكاشن',weekLabel:'أيام الأسبوع',
    searchPlaceholder:'ابحث عن مادة أو قاعة',searchLabel:'ابحث في جدول المجموعة',allWeek:'كل الأسبوع',noResults:'مفيش نتائج لـ «<span id="no-results-query"></span>»',
    noResultsHint:'جرّب اسم المادة بالعربي أو الإنجليزي، أو كود القاعة.',clearSearch:'مسح البحث',cairo:'كل المواعيد بتوقيت القاهرة.',
    groupTitle:n=>`جدولي — ${n} | علوم البيانات`,groupShare:n=>`جدولي — ${n}`,groupDescription:n=>`محاضرات وسكاشن ${n}، الفرقة الأولى، تكنولوجيا علوم البيانات، الترم الأول ٢٠٢٦ / ٢٠٢٧: المواعيد والقاعات والمحاضرين.`,
    chooseTitle:'اختار مجموعتك',chooseSub:'الفرقة الأولى · الترم الأول · ٢٠٢٦ / ٢٠٢٧',tileWord:'جروب',openGroup:g=>`افتح جدول جروب ${ar(g)}`,
    homeHint:'اضغط على جروبك لعرض المحاضرات والسكاشن.',homeUpdate:'<strong>الجدول اتحدّث:</strong> الفرقة بقت ٧ مجموعات بدل ١٢، فاتأكد من رقم مجموعتك الجديد.',
    homeTitle:'جدولي — اختار مجموعتك',homeShare:'جدولي — محاضراتك وسكاشنك في مكان واحد',homeDescription:'اختار مجموعتك وشوف المحاضرات والسكاشن ومواعيدها وقاعاتها. علوم البيانات — الفرقة الأولى — الترم الأول ٢٠٢٦ / ٢٠٢٧.',
    sourceTitle:'جدولي — المصدر والتوضيحات',sourceDescription:'مصدر جدول تكنولوجيا علوم البيانات ٢٠٢٦ / ٢٠٢٧ والتوضيحات على ملف الجامعة.',
    notFoundTitle:'جدولي — الصفحة مش موجودة',notFoundHeading:'الصفحة دي مش موجودة.',notFoundText:'يمكن الرابط قديم أو فيه غلط.',notFoundButton:'اختار مجموعتك',notFoundDescription:'الصفحة المطلوبة مش موجودة.'},
  en:{dir:'ltr',base:'/en',locale:'en_US',site:'Gadwly',num:String,days:daysEn,time:timeEn,
    skip:'Skip to content',brandLabel:'Gadwly, choose your group',brandSub:'Data Science Technology · HITU',nav:'Navigation',groups:'Groups',about:'About',pdf:'University PDF',
    other:{label:'عربي',lang:'ar',dir:'rtl',title:'اعرض الصفحة دي بالعربي'},settings:'Settings',
    disclaimer:'⚠ Note: this site is not affiliated with the university and has no official connection to it. It is just a timetable to help students.',
    offline:'You are offline. This is the last copy saved on your device.',footer:'First year · Term 1 · 2026/2027',footerLink:'Source & notes ↗',
    closeDetails:'Close details',closeSettings:'Close settings',appearance:'Appearance',light:'Light',dark:'Dark',system:'Device setting',themeHint:'Your choice is saved on this device.',maker:'Site maker',whatsapp:'WhatsApp',
    imageAlt:'Gadwly — calendar and check-mark logo in teal and orange on a dark background',twitterAlt:'Gadwly logo — your lectures and sections in one place',
    lecture:'Lecture',section:'Section',to:'to',noRoom:'Room not listed',online:'Online',liveNote:'Happening now',
    summary(l,p){const word=(n,one,many)=>`${n} ${n===1?one:many}`;return [l?word(l,'lecture','lectures'):'',p?word(p,'section','sections'):''].filter(Boolean).join(' · ');},
    dayOff:'Day off',dayOffTitle:'Day off',dayOffText:d=>`No lectures or sections on ${d}.`,restOfWeek:'See the rest of the week →',
    group:g=>`Group ${g}`,yearTerm:'First year · Term 1',changeGroup:'Change group',shareLabel:n=>`Share the ${n} link`,printLabel:'Print the week',
    printTitle:n=>`Gadwly · ${n} · First year · Term 1 2026/2027 · Cairo time`,scheduleLabel:'Lectures and sections',weekLabel:'Days of the week',
    searchPlaceholder:'Search a course, teacher or room',searchLabel:'Search this group’s timetable',allWeek:'Whole week',noResults:'No results for “<span id="no-results-query"></span>”',
    noResultsHint:'Try the course name in English or Arabic, or a room code.',clearSearch:'Clear search',cairo:'All times are Cairo time.',
    groupTitle:n=>`Gadwly — ${n} | Data Science`,groupShare:n=>`Gadwly — ${n}`,groupDescription:n=>`${n} lectures and sections, first year, Data Science Technology, Term 1 2026/2027: times, rooms and teachers.`,
    chooseTitle:'Choose your group',chooseSub:'First year · Term 1 · 2026/2027',tileWord:'Group',openGroup:g=>`Open the Group ${g} timetable`,
    homeHint:'Tap your group to see its lectures and sections.',homeUpdate:'<strong>Timetable updated:</strong> the year is now 7 groups instead of 12, so check your new group number.',
    homeTitle:'Gadwly — Choose your group',homeShare:'Gadwly — your lectures and sections in one place',homeDescription:'Choose your group to see its lectures and sections with times and rooms. Data Science Technology — first year — Term 1 2026/2027.',
    sourceTitle:'Gadwly — Source & notes',sourceDescription:'Source of the Data Science Technology 2026/2027 timetable and notes on the university file.',
    notFoundTitle:'Gadwly — Page not found',notFoundHeading:'This page doesn’t exist.',notFoundText:'The link may be old or mistyped.',notFoundButton:'Choose your group',notFoundDescription:'The requested page was not found.'}
};

const kind=(t,s)=>data.courses[s.course].hideKind?'':s.kind==='lecture'?t.lecture:t.section;
const courseName=(lang,c)=>lang==='en'?c.english:c.title;
const otherName=(lang,c)=>lang==='en'?c.title:c.english;

function layout(lang,{page,group,pathName,otherPath,title,description,shareTitle,main}){
  const t=T[lang],image=`${SITE}/share-preview-v1.png`,o=t.other;
  return `<!doctype html>
<html lang="${lang}" dir="${t.dir}" data-page="${page}"${group?` data-group="${group}" data-days="${studyDays(group).join(',')}"`:''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f7f8f4">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${pathName}">
  ${otherPath?`<link rel="alternate" hreflang="${lang}" href="${SITE}${pathName}">
  <link rel="alternate" hreflang="${o.lang}" href="${SITE}${otherPath}">
  `:''}<script>${BOOT}</script>
  <link rel="stylesheet" href="${cssFile}">
  <script defer src="${jsFile}"></script>
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${t.locale}">
  <meta property="og:site_name" content="${t.site}">
  <meta property="og:title" content="${esc(shareTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${SITE}${pathName}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(t.imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(shareTitle)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="${esc(t.twitterAlt)}">
</head>
<body>
  <a class="skip-link" href="#main">${t.skip}</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="${t.base}/" aria-label="${t.brandLabel}"><span class="brand-identity"><img class="brand-logotype logo-light" src="/jadwaly-logo-light.svg" width="138" height="54" alt=""><img class="brand-logotype logo-dark" src="/jadwaly-logo-dark.svg" width="138" height="54" alt=""><span class="brand-sub">${t.brandSub}</span></span></a>
      <nav class="header-links" aria-label="${t.nav}"><a href="${t.base}/">${t.groups}</a><a href="${t.base}/source/">${t.about}</a></nav>
      <div class="header-tools">${otherPath?`<a class="button button-small button-outline lang-switch" href="${otherPath}" hreflang="${o.lang}" lang="${o.lang}" dir="${o.dir}" data-lang="${o.lang}" title="${o.title}">${o.label}</a>`:''}<a class="button button-small button-outline source-top" href="/timetable-2026-2027.pdf" target="_blank" rel="noopener" aria-label="${t.pdf}"><span class="pdf-long">${t.pdf}</span><span class="pdf-short" lang="en">PDF</span> <span aria-hidden="true">↗</span></a><button class="settings-trigger js-only" id="open-settings" type="button" aria-label="${t.settings}" aria-haspopup="dialog"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/></svg></button></div>
    </div>
  </header>
  <p class="site-disclaimer" role="note">${t.disclaimer}</p>
  <div id="offline" class="offline" hidden>${t.offline}</div>
  <main id="main" tabindex="-1">${main}</main>
  <footer class="site-footer"><p>${t.footer}</p><a href="${t.base}/source/">${t.footerLink}</a></footer>
  ${page==='group'?`<dialog id="details" aria-labelledby="dialog-title"><button class="dialog-close" id="close-details" type="button" aria-label="${t.closeDetails}">×</button><div id="dialog-body"></div></dialog>`:''}
  <dialog id="settings" class="settings-dialog" aria-labelledby="settings-title">
    <button class="dialog-close" id="close-settings" type="button" aria-label="${t.closeSettings}">×</button>
    <h2 id="settings-title">${t.settings}</h2>
    <fieldset class="theme-fieldset"><legend>${t.appearance}</legend><div class="theme-options">
      <label class="theme-choice"><input type="radio" name="appearance" value="light"><span>${t.light}</span></label>
      <label class="theme-choice"><input type="radio" name="appearance" value="dark"><span>${t.dark}</span></label>
      <label class="theme-choice"><input type="radio" name="appearance" value="system"><span>${t.system}</span></label>
    </div><p class="theme-hint">${t.themeHint}</p></fieldset>
    <section class="settings-credit" aria-label="${t.maker}" lang="en" dir="ltr"><p>Made by <strong>Seif Ashraf</strong></p><div class="credit-links"><a href="https://seifashraf.dev" target="_blank" rel="noopener noreferrer">seifashraf.dev <span aria-hidden="true">↗</span></a><a href="https://github.com/darkxgs" target="_blank" rel="noopener noreferrer">GitHub · darkxgs <span aria-hidden="true">↗</span></a><a href="https://wa.me/seif_ashhraf" target="_blank" rel="noopener noreferrer">${t.whatsapp} · <bdi dir="ltr">seif_ashhraf</bdi> <span aria-hidden="true">↗</span></a></div></section>
  </dialog>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

function sessionRow(lang,s){
  const t=T[lang],c=data.courses[s.course],en=lang==='en',label=kind(t,s);
  // The university file writes the online lecture's room as "OL".
  const room=s.room==='OL'?t.online:s.room,roomDir=s.room==='OL'?t.dir:'ltr';
  const issue=en?s.issueEn:s.issue,clarification=en?s.clarificationEn:s.clarification;
  const notes=[
    issue&&`<p class="card-warning">⚠ ${esc(issue)}</p>`,
    clarification&&`<p class="card-note">${esc(clarification)}</p>`,
  ].filter(Boolean).join('');
  return `<div class="session-row" data-day="${s.day}" data-start="${s.start}" data-end="${s.end}" data-kind="${s.kind}" data-kind-label="${label}" data-title="${esc(courseName(lang,c))}" data-alt="${esc(otherName(lang,c))}" data-room="${esc(room||'')}"${issue?` data-issue="${esc(issue)}"`:''}${clarification?` data-clarification="${esc(clarification)}"`:''} data-search="${esc(searchText(data,s))}"><div class="session-time">${t.time(s.start)}<small>${t.to} ${t.time(s.end)}</small></div><article class="session-card ${s.kind}" data-course="${s.course}"><div class="session-card-top"><h3>${esc(courseName(lang,c))}</h3>${label?`<span class="kind-label ${s.kind}">${label}</span>`:''}</div><div class="session-meta"><span class="teacher" lang="en" dir="ltr">${esc(s.teacher)}</span><span class="room ${s.room?'':'unknown-room'}"><span dir="${room?roomDir:t.dir}">${room?esc(room):t.noRoom}</span></span></div>${notes}<span class="live-note" hidden>${t.liveNote}</span></article></div>`;
}

function daySection(lang,group,d){
  const t=T[lang],list=sessionsFor(data,group,d);
  const lectures=list.filter(s=>kind(t,s)===t.lecture).length,sections=list.filter(s=>kind(t,s)===t.section).length;
  const body=list.length?list.map(s=>sessionRow(lang,s)).join(''):`<div class="empty"><div class="empty-symbol" aria-hidden="true">${icon('sun')}</div><h3>${t.dayOffTitle}</h3><p>${t.dayOffText(t.days[d])}</p><button class="button button-outline show-week js-only" type="button">${t.restOfWeek}</button></div>`;
  return `<section class="day-section" id="day-${d}" data-day="${d}" aria-labelledby="day-${d}-title"><div class="day-heading"><h2 id="day-${d}-title">${t.days[d]}</h2><span>${list.length?t.summary(lectures,sections):t.dayOff}</span></div>${body}</section>`;
}

const pathFor=(lang,rel)=>`${T[lang].base}${rel}`;
const other=lang=>lang==='en'?'ar':'en';

function groupPage(lang,group){
  const t=T[lang],name=t.group(group),rel=`/group/${group}/`;
  const main=`<div class="container dashboard"><div class="dashboard-title"><div><h1>${name}</h1><p>${t.yearTerm}</p></div><div class="title-actions"><a class="button button-small button-outline" href="${t.base}/">${t.changeGroup}</a><button class="button button-small button-outline share-button js-only" type="button" aria-label="${t.shareLabel(name)}">${icon('share')}</button><button class="button button-small button-outline print-button js-only" type="button" aria-label="${t.printLabel}">${icon('print')}</button></div></div><p class="print-title">${t.printTitle(name)}</p><div id="next-card" class="js-only"></div><section class="schedule-main" aria-label="${t.scheduleLabel}"><nav class="day-strip" aria-label="${t.weekLabel}">${studyDays(group).map(d=>`<a class="day-button" href="#day-${d}" data-day="${d}">${t.days[d]}</a>`).join('')}</nav><script>${MARK}</script><div class="toolbar js-only"><label class="search-wrap">${icon('search')}<input id="search" type="search" placeholder="${t.searchPlaceholder}" aria-label="${t.searchLabel}" autocomplete="off"></label><button class="view-toggle" id="all-week" type="button" aria-pressed="false">${t.allWeek}</button></div><div id="schedule-results">${studyDays(group).map(d=>daySection(lang,group,d)).join('')}<div class="no-results" id="no-results" hidden><h3>${t.noResults}</h3><p>${t.noResultsHint}</p><button class="text-button" id="clear-search" type="button">${t.clearSearch}</button></div></div><p class="sub-note">${t.cairo}</p></section></div>`;
  return layout(lang,{page:'group',group,pathName:pathFor(lang,rel),otherPath:pathFor(other(lang),rel),title:t.groupTitle(name),shareTitle:t.groupShare(name),description:t.groupDescription(name),main});
}

function homePage(lang){
  const t=T[lang];
  const main=`<div class="container simple-home"><section class="groups-panel" id="groups" aria-labelledby="groups-title"><div class="section-heading"><div><h1 id="groups-title">${t.chooseTitle}</h1><p>${t.chooseSub}</p></div></div><div class="group-grid">${data.groups.map(g=>`<a class="group-tile" href="${t.base}/group/${g}/" data-group="${g}" aria-label="${t.openGroup(g)}"><span>${t.tileWord}</span><strong>${t.num(g)}</strong></a>`).join('')}</div><a class="last-group-link" href="${t.base}/" hidden></a><p class="simple-hint">${t.homeHint}</p><p class="simple-hint">${t.homeUpdate}</p></section></div>`;
  return layout(lang,{page:'home',pathName:pathFor(lang,'/'),otherPath:pathFor(other(lang),'/'),title:t.homeTitle,shareTitle:t.homeShare,description:t.homeDescription,main});
}

const sourceBody={
  ar:`<a class="back-link" href="/">→ اختيار المجموعة</a><div class="eyebrow">المصدر والتوضيحات</div><h1>جدول واضح، ومصدره قدامك.</h1><p class="source-intro">الموقع يعرض بيانات آخر ملف من الكلية للمجموعات ١–٧، مع مراعاة المواعيد المشتركة في الجدول وحدود كل مجموعة.</p><div class="source-layout"><section class="side-box"><h2>ملف جدول الجامعة</h2><p lang="en" dir="ltr">Helwan Int’l Technological University<br>Faculty of Technology in Cairo<br>Data Science Technology · Time Table 2026/2027</p><div class="source-details"><div>الفرقة<strong>الأولى</strong></div><div>الفصل الدراسي<strong>الأول · ٢٠٢٦ / ٢٠٢٧</strong></div><div>المجموعات<strong>١ إلى ٧</strong></div><div>النسخة<strong>آخر تحديث ٣</strong></div><div>تاريخ مراجعة النقل<strong>٢٧ نوفمبر ٢٠٢٦</strong></div></div><p>الجدول من النسخة المرفقة لهذا الموقع. لا يوجد تحديث مباشر من الجامعة؛ أي إعلان أحدث منها هو المرجع.</p><a class="button" href="/timetable-2026-2027.pdf" target="_blank" rel="noopener">${icon('file')} افتح الملف الأصلي ↗</a><br><a class="text-button" href="/timetable-2026-2027.pdf" download="HITU-Data-Science-2026-2027.pdf">تنزيل نسخة PDF</a></section><section class="side-box"><h2>توضيحات على الملف</h2><p>الجدول الجديد قسّم الفرقة لـ٧ مجموعات بدل ١٢، فرقم مجموعتك ممكن يكون اتغيّر؛ اتأكد منه من الكلية.</p><div class="issue-item"><strong>جروب ٤ وجروب ٧ · تكنولوجيا المعلومات</strong><p>الملف كاتب لكل واحد منهم سكشن يوم الثلاثاء ٢:٠٠–٣:٠٠ مساءً في <bdi>G202</bdi>، وكمان سكشن الخميس مع باقي المجموعات. الاتنين معروضين زي ما هما؛ اتأكد من الكلية.</p></div><div class="issue-item"><strong>سكشن تكنولوجيا المعلومات يوم الخميس</strong><p><bdi>Eng. Shimaa</bdi> مكتوبة في قاعتين <bdi>G204|G206</bdi> لكل خانة، فغالبًا المجموعات بتتقسم على القاعتين. القاعتين معروضين زي ما هما في الملف.</p></div><div class="issue-item"><strong>جروب ٦ وجروب ٧ · التحول الرقمي</strong><p>يوم الثلاثاء الخانتين مرسومين على صفين ساعات في الملف. الموعد المعروض (١٠–١١ لجروب ٦، و١١–١٢ لجروب ٧) حسب مكان الكلام جوا الخانة؛ اتأكد من الكلية.</p></div><p>محاضرة تكنولوجيا المعلومات يوم الخميس ٤–٥ مساءً أونلاين (مكتوبة <bdi>OL</bdi> في ملف الجامعة).</p></section></div><div class="help-item"><span class="help-icon">${icon('check')}</span><div><h3>خصوصيتك بسيطة</h3><p>مفيش تسجيل حساب أو درجات أو ملاحظات شخصية. آخر مجموعة اخترتها بتتحفظ في متصفحك فقط، ومش بتتبعت لطالب تاني.</p></div></div>`,
  en:`<a class="back-link" href="/en/">← Choose a group</a><div class="eyebrow">Source & notes</div><h1>A clear timetable, with its source right here.</h1><p class="source-intro">This site shows the faculty’s latest file for Groups 1–7, keeping each shared slot within the groups it covers. Course names, teachers and rooms are written exactly as printed.</p><div class="source-layout"><section class="side-box"><h2>The university timetable file</h2><p>Helwan Int’l Technological University<br>Faculty of Technology in Cairo<br>Data Science Technology · Time Table 2026/2027</p><div class="source-details"><div>Year<strong>First</strong></div><div>Term<strong>1 · 2026/2027</strong></div><div>Groups<strong>1 to 7</strong></div><div>Version<strong>Last update 3</strong></div><div>Transcription reviewed<strong>27 November 2026</strong></div></div><p>The timetable comes from the copy supplied for this site. Nothing syncs from the university; any newer announcement from them takes priority.</p><a class="button" href="/timetable-2026-2027.pdf" target="_blank" rel="noopener">${icon('file')} Open the original file ↗</a><br><a class="text-button" href="/timetable-2026-2027.pdf" download="HITU-Data-Science-2026-2027.pdf">Download the PDF</a></section><section class="side-box"><h2>Notes on the file</h2><p>The new timetable splits the year into 7 groups instead of 12, so your group number may have changed; confirm it with the faculty.</p><div class="issue-item"><strong>Groups 4 and 7 · Information Technology</strong><p>The file gives each of them a section on Tuesday 2:00–3:00 PM in <bdi>G202</bdi>, as well as the Thursday section with the other groups. Both are shown as printed; check with the faculty.</p></div><div class="issue-item"><strong>Thursday Information Technology sections</strong><p><bdi>Eng. Shimaa</bdi> is listed in two rooms, <bdi>G204|G206</bdi>, in each cell, so the groups are probably split between the two rooms. Both rooms are shown as printed.</p></div><div class="issue-item"><strong>Groups 6 and 7 · Digital Transformation</strong><p>On Tuesday these two cells are drawn across two hour rows in the file. The times shown (10–11 for Group 6, 11–12 for Group 7) follow where the text sits in the cell; check with the faculty.</p></div><p>The Thursday 4–5 PM Information Technology lecture is online (written <bdi>OL</bdi> in the university file).</p></section></div><div class="help-item"><span class="help-icon">${icon('check')}</span><div><h3>Simple privacy</h3><p>No account, grades or personal notes. Your last chosen group and your preferences are saved only in your browser and never sent anywhere.</p></div></div>`
};

function sourcePage(lang){
  const t=T[lang];
  return layout(lang,{page:'source',pathName:pathFor(lang,'/source/'),otherPath:pathFor(other(lang),'/source/'),title:t.sourceTitle,shareTitle:t.sourceTitle,description:t.sourceDescription,main:`<div class="container source-page">${sourceBody[lang]}</div>`});
}

function notFoundPage(){
  const a=T.ar,e=T.en;
  const main=`<div class="container source-page"><div class="eyebrow">٤٠٤</div><h1>${a.notFoundHeading}</h1><p class="source-intro">${a.notFoundText}</p><a class="button" href="/">${a.notFoundButton}</a><p class="source-intro" lang="en" dir="ltr">${e.notFoundHeading} ${e.notFoundText} <a href="/en/">${e.notFoundButton} →</a></p></div>`;
  return layout('ar',{page:'404',pathName:'/404.html',title:a.notFoundTitle,shareTitle:a.site,description:a.notFoundDescription,main});
}

const pages=[];
for(const lang of ['ar','en']){
  const b=T[lang].base;
  write(`${b.slice(1)}${b?'/':''}index.html`,homePage(lang));
  for(const g of data.groups)write(`${b.slice(1)}${b?'/':''}group/${g}/index.html`,groupPage(lang,g));
  write(`${b.slice(1)}${b?'/':''}source/index.html`,sourcePage(lang));
  pages.push(`${b}/`,`${b}/source/`,...data.groups.map(g=>`${b}/group/${g}/`));
}
write('404.html',notFoundPage());
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p=>`  <url><loc>${SITE}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
const precache=['/',cssFile,jsFile];
write('sw.js',read('src/sw.js').replace('__VERSION__',hash(css+js+precache.join())).replace('__PRECACHE__',JSON.stringify(precache)));
console.log(`Built ${pages.length} pages into dist/ (${cssFile}, ${jsFile})`);
