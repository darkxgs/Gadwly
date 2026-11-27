from pathlib import Path
import hashlib,json,shutil,argparse
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Regenerate the reviewed 2026/2027 transcription using its source PDF.')
parser.add_argument('pdf',type=Path,help='Path to the original timetable PDF')
args=parser.parse_args()
# Transcription of the university timetable "last update 3" (one page, first year, 7 groups), received 2026-11-27.
# Shared PDF cells are expanded only across their actual columns. Cells spanning 3+ groups in one room are lectures;
# smaller cells, and Eng. Shimaa's IT cells printed in two rooms (G204|G206), are sections.
rows=[]
def add(g,d,h,c,t,r,cell,issue=None,kind=None):
 groups=list(g) if isinstance(g,range) else ([g] if isinstance(g,int) else g)
 rows.append(dict(groups=groups,kind=kind or ('lecture' if len(groups)>=3 else 'section'),day=d,start=None if h is None else round(h*60),end=None if h is None else round((h+1)*60),course=c,teacher=t,room=r,sourceCell=cell,issue=issue))
A='Eng. Aya Gamal'; H='Eng. Habiba Saeed'; N='Eng. Nada Abdo'; R='Eng. Radwa'; S='Eng. Shahd Yehia'; I='Eng. Shimaa'; M='Eng. Shimaa Mohamed'; Z='Eng. Zeinab'; B='Dr. Bahaa Salah'; E='Mr. Adham'
# Saturday
for g,h,c,t,r,cell in [
(range(1,5),9,'systems','Dr. Hend','G204','sat-09-g1-4'),(5,9,'physics',A,'G105','sat-09-g5'),
(range(1,5),10,'statistics','Dr. Muhammed Abdulhakem','A305','sat-10-g1-4'),(range(5,8),10,'systems','Dr. Hend','G204','sat-10-g5-7'),
(1,11,'physics',H,'G106','sat-11-g1'),(4,11,'physics',A,'G105','sat-11-g4'),(range(5,8),11,'statistics','Dr. Muhammed Abdulhakem','A305','sat-11-g5-7'),
(range(1,5),12,'english','Dr. Ahmed Hassan','G204','sat-12-g1-4'),(7,12,'physics',H,'G106','sat-12-g7'),
(3,13,'physics',A,'G106','sat-13-g3'),(range(5,8),13,'english','Dr. Ahmed Hassan','G204','sat-13-g5-7'),
(2,14,'physics',A,'G106','sat-14-g2'),(6,15,'physics',A,'G106','sat-15-g6')]:add(g,6,h,c,t,r,cell)
# Sunday
for g,h,c,t,r,cell in [
(1,9,'statistics',S,'G106','sun-09-g1'),(3,10,'statistics',S,'G106','sun-10-g3'),(4,11,'statistics',S,'G106','sun-11-g4'),
(range(1,5),12,'culture','Dr. Sherief Al-Shorbagy','G205','sun-12-g1-4'),(range(5,8),13,'culture','Dr. Sherief Al-Shorbagy','G205','sun-13-g5-7'),
(range(1,5),15,'english',E,'G202','sun-15-g1-4'),(7,15,'statistics',S,'A308','sun-15-g7'),
(range(5,8),16,'english',E,'G202','sun-16-g5-7')]:add(g,0,h,c,t,r,cell)
# Tuesday
it_twice='ملف الجامعة الجديد كاتب لجروبك سكشن تكنولوجيا معلومات تاني يوم الخميس مع نفس المهندسة؛ اتأكد من الكلية لو الاتنين مطلوبين.'
for g,h,c,t,r,cell,issue in [
(1,9,'math',H,'G105','tue-09-g1',None),(7,9,'systems',M,'A303','tue-09-g7',None),
(2,10,'math',H,'A306','tue-10-g2',None),(4,10,'systems',M,'A303','tue-10-g4',None),(6,10,'digital',R,'G105','tue-10-g6',None),
(5,11,'systems',M,'A303','tue-11-g5',None),(7,11,'digital',R,'G203','tue-11-g7',None),
([1,2],12,'systems',N,'A201','tue-12-g1-2',None),(4,12,'math',H,'A306','tue-12-g4',None),(5,12,'digital',R,'G105','tue-12-g5',None),(6,12,'systems',M,'A303','tue-12-g6',None),
(3,13,'systems',N,'A201','tue-13-g3',None),(5,13,'math',H,'A306','tue-13-g5',None),
(4,14,'it',I,'G202','tue-14-g4',it_twice),(6,14,'math',H,'A306','tue-14-g6',None),(7,14,'it',I,'G202','tue-14-g7',it_twice),
([3,4],15,'digital',R,'A304','tue-15-g3-4',None),(7,15,'math',H,'A306','tue-15-g7',None),
([1,2],16,'digital',R,'A304','tue-16-g1-2',None)]:add(g,2,h,c,t,r,cell,issue)
# Thursday
for g,h,c,t,r,cell,kind in [
(range(1,5),9,'physics',B,'G205','thu-09-g1-4',None),(range(5,8),10,'physics',B,'G205','thu-10-g5-7',None),
(3,11,'math',Z,'A306','thu-11-g3',None),
(range(1,5),12,'math',B,'G201','thu-12-g1-4',None),(6,12,'statistics',S,'G105','thu-12-g6',None),
(2,13,'statistics',S,'G105','thu-13-g2',None),(range(5,8),13,'math',B,'G201','thu-13-g5-7',None),
(range(1,5),14,'it',I,'G204|G206','thu-14-g1-4','section'),(5,14,'statistics',S,'G105','thu-14-g5',None),
(range(5,8),15,'it',I,'G204|G206','thu-15-g5-7','section'),
(range(1,8),16,'it','Dr. Radwa Hamza','OL','thu-16-g1-7',None)]:add(g,4,h,c,t,r,cell,None,kind)
span_note='الخانة دي في ملف الجامعة مرسومة على صفين ساعات؛ الموعد ده حسب مكان الكلام جواها. اتأكد من الكلية.'
for row in rows:
 if row['sourceCell'] in ('tue-10-g6','tue-11-g7'):row['clarification']=span_note
courses={
'physics':dict(title='الفيزياء التطبيقية',english='Applied Physics',color='mint'),
'systems':dict(title='مقدمة في نظم المعلومات',english='Introduction To Information System',color='blue'),
'statistics':dict(title='الإحصاء',english='Statistics',color='orange'),
'english':dict(title='اللغة الإنجليزية',english='English Language',color='purple'),
'culture':dict(title='ثقافة التحول الرقمي',english='Digital Transformation Culture',color='gold'),
'digital':dict(title='التحول الرقمي',english='Digital Transformation',color='gold'),
'math':dict(title='الرياضيات',english='Mathematics',color='purple'),
'it':dict(title='تكنولوجيا المعلومات',english='Information Technology',color='blue')}
sessions=[]
for idx,row in enumerate(rows):
 for group in row['groups']:
  sessions.append(dict(id=f'g{group}-s{idx+1}',group=group,**{k:v for k,v in row.items() if k!='groups'}))
source=args.pdf
if source.resolve()!=(ROOT/'site/timetable-2026-2027.pdf').resolve():
 shutil.copyfile(source,ROOT/'site/timetable-2026-2027.pdf')
meta=dict(title='Data Science Technology',university="Helwan Int’l Technological University",academicYear='2026/2027',year=1,term=1,groups=list(range(1,8)),sourceFile='timetable-2026-2027.pdf',sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),reviewedOn='2026-11-27',scopeNote='يعرض الموقع الملف المرفق فقط. أي تعديل لاحق من الجامعة يُرجع فيه إلى إعلانها الرسمي.',courses=courses,sessions=sessions)
(ROOT/'data/timetable.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'source-audit.json').write_text(json.dumps(dict(sourceSha256=meta['sourceSha256'],sourceCells=rows),ensure_ascii=False,indent=2),encoding='utf8')
for g in meta['groups']:
 a=[s for s in sessions if s['group']==g];print('Group',g,len(a),'sessions',len([s for s in a if s['issue']]),'uncertain')
