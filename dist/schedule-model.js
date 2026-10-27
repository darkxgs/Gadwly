export const days = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
export const weekOrder = [6,0,1,2,3,4,5];
export const ar = n => new Intl.NumberFormat('ar-EG',{useGrouping:false}).format(n);
export function parseGroup(value) { return /^(?:[1-9]|1[0-2])$/.test(String(value)) ? Number(value) : null; }
export function sessionsFor(data,group,day) {return data.sessions.filter(s=>s.group===group&&(day===undefined||s.day===day)).sort((a,b)=>(a.start??2000)-(b.start??2000));}
export function cairoNow(date = new Date()) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  return {day:new Date(Date.UTC(+p.year,+p.month-1,+p.day)).getUTCDay(),minutes:+p.hour*60+ +p.minute,date};
}
export function nextSession(data,group,now=cairoNow()) {
  for(let offset=0;offset<8;offset++) {
    const list=sessionsFor(data,group,(now.day+offset)%7).filter(s=>s.start!==null);
    const session=list.find(s=>offset>0||s.end>now.minutes);
    if(session)return {session,offset,live:offset===0&&session.start<=now.minutes,wait:offset*1440+session.start-now.minutes};
  }
  return null;
}
export function time(minute) {
  if(minute===null)return 'غير مؤكّد';
  const hour=Math.floor(minute/60),min=minute%60;
  return `${ar(hour%12||12)}:${ar(min).padStart(2,'٠')} ${hour>=12?'م':'ص'}`;
}
export function matches(data,session,query) {
  const normalize=t=>String(t??'').normalize('NFKC').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي');
  const c=data.courses[session.course];
  return normalize([c.title,c.english,session.teacher,session.room].join(' ')).includes(normalize(query.trim()));
}
