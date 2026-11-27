import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseGroup,sessionsFor,cairoNow,nextSession,matches,time} from '../src/schedule-model.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/timetable.json',import.meta.url)));
test('all seven groups have the audited number of sessions with no time overlaps',()=>{
  assert.deepEqual(data.groups,[1,2,3,4,5,6,7]);
  const counts=[14,14,14,15,14,14,15];
  assert.equal(new Set(data.sessions.map(s=>s.id)).size,data.sessions.length);
  assert.equal(data.sessions.length,100);
  for(const group of data.groups){
    assert.equal(sessionsFor(data,group).length,counts[group-1]);
    for(let day=0;day<7;day++){
      const list=sessionsFor(data,group,day);
      if([1,3,5].includes(day))assert.equal(list.length,0);
      for(let i=0;i<list.length;i++){
        const s=list[i];assert.ok(data.courses[s.course]);assert.ok(s.teacher);assert.ok(s.room);assert.equal(s.end-s.start,60);assert.ok(Number.isInteger(s.start));
        if(i)assert.ok(s.start>=list[i-1].end,`overlap for ${group}, ${day}`);
      }
    }
  }
});
test('merged source cells expand only to the stated groups',()=>{
  const lesson=(day,start,course,teacher)=>data.sessions.filter(s=>s.day===day&&s.start===start&&s.course===course&&(!teacher||s.teacher===teacher)).map(s=>s.group).sort((a,b)=>a-b);
  assert.deepEqual(lesson(6,540,'systems'),[1,2,3,4]);
  assert.deepEqual(lesson(6,600,'systems'),[5,6,7]);
  assert.deepEqual(lesson(6,600,'statistics'),[1,2,3,4]);
  assert.deepEqual(lesson(0,900,'english','Mr. Adham'),[1,2,3,4]);
  assert.deepEqual(lesson(0,960,'english','Mr. Adham'),[5,6,7]);
  assert.deepEqual(lesson(2,720,'systems','Eng. Nada Abdo'),[1,2]);
  assert.deepEqual(lesson(2,900,'digital'),[3,4]);
  assert.deepEqual(lesson(2,960,'digital'),[1,2]);
  assert.deepEqual(lesson(4,840,'it'),[1,2,3,4]);
  assert.deepEqual(lesson(4,900,'it'),[5,6,7]);
  assert.deepEqual(lesson(4,960,'it'),[1,2,3,4,5,6,7]);
});
test('wide shared PDF cells are lectures and smaller or two-room cells are sections',()=>{
  const source=JSON.parse(fs.readFileSync(new URL('../source-audit.json',import.meta.url)));
  for(const cell of source.sourceCells){assert.equal(cell.kind,cell.groups.length>=3&&!cell.room.includes('|')?'lecture':'section',cell.sourceCell);}
  assert.ok(data.sessions.every(s=>['lecture','section'].includes(s.kind)));
  assert.equal(sessionsFor(data,5).filter(s=>s.kind==='lecture').length,8);
  assert.equal(sessionsFor(data,5).filter(s=>s.kind==='section').length,6);
  assert.ok(data.sessions.filter(s=>s.course==='digital').every(s=>s.kind==='section'));
  assert.ok(data.sessions.filter(s=>s.course==='culture').every(s=>s.kind==='lecture'));
  assert.ok(data.sessions.filter(s=>s.room==='G204|G206').every(s=>s.kind==='section'));
});
test('group 5 exactly matches the revised PDF',()=>{
  const expected=[[6,540,'physics','G105'],[6,600,'systems','G204'],[6,660,'statistics','A305'],[6,780,'english','G204'],[0,780,'culture','G205'],[0,960,'english','G202'],[2,660,'systems','A303'],[2,720,'digital','G105'],[2,780,'math','A306'],[4,600,'physics','G205'],[4,780,'math','G201'],[4,840,'statistics','G105'],[4,900,'it','G204|G206'],[4,960,'it','OL']];
  const key=a=>JSON.stringify(a);assert.deepEqual(sessionsFor(data,5).map(s=>[s.day,s.start,s.course,s.room]).sort((a,b)=>key(a).localeCompare(key(b))),expected.sort((a,b)=>key(a).localeCompare(key(b))));
});
test('Tuesday cells drawn across two hour rows carry a note',()=>{
  assert.deepEqual(data.sessions.filter(s=>s.clarification).map(s=>[s.group,s.day,s.start,s.course]),[[6,2,600,'digital'],[7,2,660,'digital']]);
});
test('original room codes are preserved',()=>{
  assert.ok(data.sessions.every(s=>s.room));
  assert.ok(data.sessions.filter(s=>s.day===4&&s.start===960).every(s=>s.room==='OL'));
  assert.equal(sessionsFor(data,7,0).find(s=>s.course==='statistics').room,'A308');
  assert.equal(sessionsFor(data,3,6).find(s=>s.course==='physics').room,'G106');
});
test('next class observes boundaries, the selected group and Cairo DST',()=>{
  assert.equal(nextSession(data,5,{day:6,minutes:540}).live,true);
  assert.equal(nextSession(data,5,{day:6,minutes:600}).session.course,'systems');
  assert.equal(nextSession(data,5,{day:4,minutes:1020}).offset,2);
  assert.equal(nextSession(data,6,{day:4,minutes:690}).session.course,'statistics');
  assert.equal(nextSession(data,6,{day:4,minutes:690}).session.start,720);
  assert.equal(cairoNow(new Date('2026-10-24T22:30:00Z')).minutes,90);
  assert.equal(cairoNow(new Date('2026-12-01T10:00:00Z')).minutes,720);
});
test('group query validation and multilingual timetable search',()=>{
  for(const value of ['0','8','12','5x','1.2','-1','<script>','05',null])assert.equal(parseGroup(value),null);
  assert.equal(parseGroup('7'),7);
  assert.ok(matches(data,sessionsFor(data,5,6)[0],'إحصاء')||sessionsFor(data,5,6).some(s=>matches(data,s,'إحصاء')));
  assert.ok(sessionsFor(data,7,2).some(s=>matches(data,s,'SHIMAA MOHAMED')));
  assert.ok(sessionsFor(data,5,6).some(s=>matches(data,s,'g105')));
});
const dist=new URL('../dist/',import.meta.url);
const distPath=rel=>new URL(rel,dist);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const distFiles=walk(fs.realpathSync(dist));
const html=rel=>fs.readFileSync(distPath(rel),'utf8');
test('the downloadable PDF is unchanged and public assets exclude personal files',()=>{
  for(const root of ['../site/','../dist/']){
    const pdf=fs.readFileSync(new URL(root+data.sourceFile,import.meta.url));assert.equal(crypto.createHash('sha256').update(pdf).digest('hex'),data.sourceSha256);
  }
  assert.ok(!distFiles.some(f=>/\.(apk)$|secrets|personal|grades|backup|reminders|redmi/i.test(f)));
  for(const f of distFiles.filter(f=>/\.(html|js|css|json|webmanifest|svg|xml|txt)$/.test(f))){
    // The requested maker credit is allowed inside Settings; personal timetable features remain excluded.
    const content=fs.readFileSync(f,'utf8').replace(/<section class="settings-credit"[\s\S]*?<\/section>/g,'');
    assert.ok(!/سيف|Seif|صُنع لسيف|ركن سيف/i.test(content),f);
  }
});
test('every group page is pre-rendered with exactly its own sessions',()=>{
  for(const group of data.groups){
    const page=html(`group/${group}/index.html`);
    const rows=[...page.matchAll(/<div class="session-row" data-day="(\d)" data-start="(\d+)" data-end="(\d+)"[^>]*>[\s\S]*?<article class="session-card (\w+)" data-course="(\w+)">[\s\S]*?<span class="teacher"[^>]*>([^<]*)<\/span>/g)].map(m=>[+m[1],+m[2],+m[3],m[4],m[5],m[6]]);
    const expected=sessionsFor(data,group).map(s=>[s.day,s.start,s.end,s.kind,s.course,s.teacher]);
    assert.deepEqual(rows.sort(),expected.sort(),`group ${group}`);
    assert.match(page,new RegExp(`data-group="${group}"`));
    assert.equal((page.match(/class="day-section"/g)||[]).length,4);
    assert.equal((page.match(/class="day-button"/g)||[]).length,4);
    assert.match(page,/data-days="6,0,2,4"/);
    assert.ok(!page.includes('يوم إجازة'),`group ${group} still shows a day off`);
  }
});
test('the double IT section warning appears only on groups 4 and 7',()=>{
  const warnings=g=>(html(`group/${g}/index.html`).match(/class="card-warning">/g)||[]).length;
  assert.deepEqual(data.groups.map(warnings),[0,0,0,1,0,0,1]);
});
test('every session card shows its lecture or section label',()=>{
  for(const group of data.groups){
    const cards=[...html(`group/${group}/index.html`).matchAll(/data-course="(\w+)"><div class="session-card-top"><h3>[^<]*<\/h3>(<span class="kind-label)?/g)];
    assert.equal(cards.length,sessionsFor(data,group).length);
    assert.ok(cards.every(([,,label])=>label),`group ${group}`);
  }
});
test('home, source, 404 and sitemap pages exist and link to all groups',()=>{
  const home=html('index.html');
  for(const g of data.groups)assert.ok(home.includes(`href="/group/${g}/"`));
  assert.ok(html('source/index.html').includes('G204|G206'));
  assert.ok(html('404.html').includes('href="/"'));
  assert.equal((html('sitemap.xml').match(/<loc>/g)||[]).length,18);
  const enHome=html('en/index.html');
  for(const g of data.groups)assert.ok(enHome.includes(`href="/en/group/${g}/"`));
  assert.ok(html('en/source/index.html').includes('G204|G206'));
});
test('every page says the site is unofficial and may contain mistakes',()=>{
  for(const f of distFiles.filter(f=>f.endsWith('.html'))){
    const page=fs.readFileSync(f,'utf8');
    assert.match(page,/class="site-disclaimer"[^>]*>[^<]*(مش تابع للجامعة[^<]*ممكن يكون فيه أخطاء|not affiliated with the university[^<]*may contain mistakes)/,f);
  }
});
test('every local link and asset referenced by the pages exists',()=>{
  for(const f of distFiles.filter(f=>f.endsWith('.html'))){
    for(const [,ref] of fs.readFileSync(f,'utf8').matchAll(/(?:href|src)="(\/[^"#?]*)/g)){
      if(ref.startsWith('/_vercel/'))continue;
      const target=distPath('.'+ref+(ref.endsWith('/')?'index.html':''));
      assert.ok(fs.existsSync(target),`${path.basename(path.dirname(f))}/${path.basename(f)} -> ${ref}`);
    }
  }
});
test('the browser bundle avoids syntax that older phones cannot parse',()=>{
  const bundles=distFiles.filter(f=>/[\\/]assets[\\/]app\.\w+\.js$/.test(f));
  assert.equal(bundles.length,1);
  const js=fs.readFileSync(bundles[0],'utf8');
  assert.ok(!/\?\.(?!\d)|\?\?|^\s*(?:import|export)\s/m.test(js));
  const sw=html('sw.js');assert.ok(!sw.includes('__VERSION__')&&!sw.includes('__PRECACHE__'));
});
test('English pages mirror the Arabic ones with the course names printed in the PDF',()=>{
  for(const group of data.groups){
    const ar=html(`group/${group}/index.html`),en=html(`en/group/${group}/index.html`);
    assert.match(en,/<html lang="en" dir="ltr"/);assert.match(ar,/<html lang="ar" dir="rtl"/);
    const rows=page=>[...page.matchAll(/<div class="session-row" data-day="(\d)" data-start="(\d+)" data-end="(\d+)"[^>]*>[\s\S]*?data-course="(\w+)"><div class="session-card-top"><h3>([^<]*)<\/h3>[\s\S]*?<span class="teacher"[^>]*>([^<]*)<\/span>/g)].map(m=>m.slice(1));
    const enRows=rows(en);
    assert.deepEqual(enRows.map(r=>[r[0],r[1],r[2],r[3],r[5]]),rows(ar).map(r=>[r[0],r[1],r[2],r[3],r[5]]),`group ${group}`);
    for(const r of enRows)assert.equal(r[4],data.courses[r[3]].english);
    assert.ok(!/[؀-ۿ]/.test(en.replace(/<section class="session-row"|data-search="[^"]*"|data-alt="[^"]*"|<a class="button button-small button-outline lang-switch"[^>]*>[^<]*<\/a>|<link rel="alternate"[^>]*>/g,'')),`group ${group} English page still has Arabic text`);
    assert.ok(ar.includes(`href="/en/group/${group}/"`)&&en.includes(`href="/group/${group}/"`),`group ${group} language links`);
    assert.ok(/Lecture|Section/.test(en)&&!/محاضرة|سكشن/.test(en.replace(/data-search="[^"]*"/g,'')));
  }
  assert.ok(html('en/group/4/index.html').includes('also gives your group an IT section on Thursday'));
  assert.ok(html('en/group/5/index.html').includes('9:00 AM<small>to 10:00 AM</small>'));
});
