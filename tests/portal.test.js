import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseGroup,sessionsFor,cairoNow,nextSession,matches,time} from '../dist/schedule-model.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/timetable.json',import.meta.url)));
test('all twelve groups have the audited number of sessions with no time overlaps',()=>{
  assert.deepEqual(data.groups,[1,2,3,4,5,6,7,8,9,10,11,12]);
  const counts=[14,14,14,14,13,13,12,12,12,12,12,12];
  assert.equal(new Set(data.sessions.map(s=>s.id)).size,data.sessions.length);
  for(const group of data.groups){
    assert.equal(sessionsFor(data,group).length,counts[group-1]);
    for(let day=0;day<7;day++){
      const list=sessionsFor(data,group,day);
      if([1,3,5].includes(day))assert.equal(list.length,0);
      for(let i=0;i<list.length;i++){
        const s=list[i];assert.ok(data.courses[s.course]);assert.ok(s.teacher);assert.equal(s.end-s.start,60);assert.ok(Number.isInteger(s.start));
        if(i)assert.ok(s.start>=list[i-1].end,`overlap for ${group}, ${day}`);
      }
    }
  }
});
test('merged source cells expand only to the stated groups',()=>{
  const lesson=(day,start,course,teacher)=>data.sessions.filter(s=>s.day===day&&s.start===start&&s.course===course&&(!teacher||s.teacher===teacher)).map(s=>s.group).sort((a,b)=>a-b);
  assert.deepEqual(lesson(0,1020,'physics'),[1,2,3,4,5,6]);
  assert.deepEqual(lesson(4,1020,'it'),[1,2,3,4]);
  assert.deepEqual(lesson(2,660,'digital'),[7,8]);
  assert.deepEqual(lesson(2,840,'digital'),[10,11]);
  assert.deepEqual(lesson(6,540,'systems'),[1,2,3,4]);
  assert.deepEqual(lesson(6,600,'systems'),[5,6,7,8]);
  assert.deepEqual(lesson(6,660,'systems'),[9,10,11,12]);
  assert.deepEqual(lesson(4,720,'math','Dr. Bahaa Salah'),[1,2,3,4]);
  assert.deepEqual(lesson(4,780,'math','Dr. Bahaa Salah'),[5,6,7,8]);
  assert.deepEqual(lesson(4,840,'math','Dr. Bahaa Salah'),[9,10,11,12]);
});
test('wide shared PDF cells are lectures and smaller cells are sections',()=>{
  const source=JSON.parse(fs.readFileSync(new URL('../source-audit.json',import.meta.url)));
  for(const cell of source.sourceCells){assert.equal(cell.kind,cell.groups.length>=4?'lecture':'section');}
  assert.ok(data.sessions.every(s=>['lecture','section'].includes(s.kind)));
  assert.equal(sessionsFor(data,5).filter(s=>s.kind==='lecture').length,7);
  assert.equal(sessionsFor(data,5).filter(s=>s.kind==='section').length,6);
  assert.ok(data.sessions.filter(s=>s.course==='digital').every(s=>s.kind==='section'));
  assert.ok(data.sessions.filter(s=>s.course==='culture').every(s=>s.kind==='lecture'));
  assert.ok(data.sessions.filter(s=>s.day===0&&s.start===1020).every(s=>s.kind==='lecture'));
});
test('group 5 exactly matches the original user-provided timetable',()=>{
  const expected=[[6,540,'physics','G105'],[6,600,'systems','G204'],[6,660,'statistics','A305'],[6,780,'english','G204'],[0,720,'systems','G105'],[0,780,'culture','G205'],[0,900,'digital','A305'],[0,1020,'physics',null],[2,780,'math','A306'],[4,600,'physics','G205'],[4,720,'it','G106'],[4,780,'math','G201'],[4,840,'statistics','G105']];
  const key=a=>JSON.stringify(a);assert.deepEqual(sessionsFor(data,5).map(s=>[s.day,s.start,s.course,s.room]).sort((a,b)=>key(a).localeCompare(key(b))),expected.sort((a,b)=>key(a).localeCompare(key(b))));
});
test('user-clarified Thursday timings preserve the half-hour class',()=>{
  const it=sessionsFor(data,1,4).find(s=>s.course==='it'&&s.teacher==='Eng. Shimaa');
  const stats=sessionsFor(data,6,4).find(s=>s.course==='statistics');
  assert.equal(it.start,600);assert.equal(it.end,660);assert.equal(it.room,'G106');assert.ok(it.clarification);
  assert.equal(stats.start,690);assert.equal(stats.end,750);assert.equal(stats.room,'G105');assert.ok(stats.clarification);assert.equal(time(stats.start),'١١:٣٠ ص');
});
test('rooms missing in the PDF stay unknown, and original room codes are preserved',()=>{
  assert.equal(data.sessions.filter(s=>!s.room).length,6);
  assert.ok(data.sessions.filter(s=>!s.room).every(s=>s.day===0&&s.start===1020&&s.course==='physics'));
  assert.equal(sessionsFor(data,3,6).find(s=>s.course==='physics').room,'G106');
  assert.equal(sessionsFor(data,8,2).find(s=>s.course==='math').room,'A305');
  assert.equal(sessionsFor(data,7,0).find(s=>s.course==='statistics').room,'G202');
});
test('next class observes boundaries, the selected group and Cairo DST',()=>{
  assert.equal(nextSession(data,5,{day:6,minutes:540}).live,true);
  assert.equal(nextSession(data,5,{day:6,minutes:600}).session.course,'systems');
  assert.equal(nextSession(data,5,{day:4,minutes:900}).offset,2);
  assert.equal(nextSession(data,6,{day:4,minutes:690}).session.course,'statistics');
  assert.equal(cairoNow(new Date('2026-10-24T22:30:00Z')).minutes,90);
  assert.equal(cairoNow(new Date('2026-12-01T10:00:00Z')).minutes,720);
});
test('group query validation and multilingual timetable search',()=>{
  for(const value of ['0','13','5x','1.2','-1','<script>','05',null])assert.equal(parseGroup(value),null);
  assert.equal(parseGroup('12'),12);
  assert.ok(matches(data,sessionsFor(data,5,6)[0],'إحصاء')||sessionsFor(data,5,6).some(s=>matches(data,s,'إحصاء')));
  assert.ok(sessionsFor(data,12,2).some(s=>matches(data,s,'SHIMAA MOHAMED')));
  assert.ok(sessionsFor(data,5,6).some(s=>matches(data,s,'g105')));
});
test('the downloadable PDF is unchanged and public assets exclude personal files',()=>{
  const root=new URL('../dist/',import.meta.url);
  const pdf=fs.readFileSync(new URL(data.sourceFile,root));assert.equal(crypto.createHash('sha256').update(pdf).digest('hex'),data.sourceSha256);
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  const files=walk(root.pathname.replace(/^\/(\w:)/,'$1'));
  assert.ok(!files.some(f=>/\.(apk)$|secrets|personal|grades|backup|reminders|redmi/i.test(f)));
  for(const f of files.filter(f=>/\.(html|js|css|json|webmanifest|svg)$/.test(f))){assert.ok(!/سيف|Seif|صُنع لسيف|ركن سيف/i.test(fs.readFileSync(f,'utf8')),f);}
});
