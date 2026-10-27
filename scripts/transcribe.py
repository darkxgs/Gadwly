from pathlib import Path
import hashlib,json,shutil,argparse
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Regenerate the reviewed 2026/2027 transcription using its source PDF.')
parser.add_argument('pdf',type=Path,help='Path to the original one-page timetable PDF')
args=parser.parse_args()
# Transcription from the one-page university timetable. Shared PDF cells are expanded only across their actual columns.
rows=[]
def add(g,d,h,c,t,r,cell,issue=None):
 groups=list(g) if isinstance(g,range) else ([g] if isinstance(g,int) else g)
 rows.append(dict(groups=groups,kind='lecture' if len(groups)>=4 else 'section',day=d,start=None if h is None else h*60,end=None if h is None else (h+1)*60,course=c,teacher=t,room=r,sourceCell=cell,issue=issue))
A='Eng. Aya Gamal'; H='Eng. Habiba Saeed'; N='Eng. Nada Abdo'; R='Eng. Radwa'; S='Eng. Shahd Yehia'; I='Eng. Shimaa'; M='Eng. Shimaa Mohamed'; Z='Eng. Zeinab'; B='Dr. Bahaa Salah'
# Saturday
for g,h,c,t,r,cell in [
(range(1,5),9,'systems','Dr. Hend','G204',0),(5,9,'physics',A,'G105',33),(12,9,'physics',H,'G106',89),
(range(1,5),10,'statistics','Dr. Muhammed Abdulhakem','A305',1),(range(5,9),10,'systems','Dr. Hend','G204',34),(9,10,'physics',A,'G105',66),
(1,11,'physics',H,'G106',2),(4,11,'physics',A,'G105',28),(range(5,9),11,'statistics','Dr. Muhammed Abdulhakem','A305',35),(range(9,13),11,'systems','Dr. Hend','G204',67),
(range(1,5),12,'english','Dr. Ahmed Hassan','G204',3),(8,12,'physics',H,'G106',61),(range(9,13),12,'statistics','Dr. Muhammed Abdulhakem','A305',68),
(range(5,9),13,'english','Dr. Ahmed Hassan','G204',36),(10,13,'physics',H,'G106',78),
(2,14,'physics',A,'G105',15),(7,14,'physics',H,'G106',54),(range(9,13),14,'english','Dr. Ahmed Hassan','G204',69),
(3,15,'physics',A,'G106',22),(6,15,'physics',A,'G105',47),(11,16,'physics',H,'G106',85)]:add(g,6,h,c,t,r,cell)
# Sunday
for g,h,c,t,r,cell in [
(1,9,'statistics',S,'G106',4),(1,10,'systems',N,'G105',5),(2,10,'digital',R,'A305',16),(3,10,'statistics',S,'G106',23),
(1,11,'digital',R,'A305',6),(2,11,'systems',N,'G105',17),(4,11,'statistics',S,'G106',29),
(range(1,5),12,'culture','Dr. Sherief Al-Shorbagy','G205',7),(5,12,'systems',N,'G105',37),(9,12,'statistics',S,'G106',70),
(3,13,'systems',N,'G105',24),(range(5,9),13,'culture','Dr. Sherief Al-Shorbagy','G205',38),
([3,4],14,'digital',R,'A305',25),(8,14,'statistics',S,'G105',62),(range(9,13),14,'culture','Dr. Sherief Al-Shorbagy','G205',71),
([5,6],15,'digital',R,'A305',39),(7,15,'statistics',S,'G202',55),(10,16,'statistics',S,'G202',79),
(range(1,7),17,'physics',B,None,'sun-17-g1-6')]:add(g,0,h,c,t,r,cell)
# Tuesday
for g,h,c,t,r,cell in [
(1,9,'math',H,'G105','tue-09-g1'),(9,9,'it',I,'A303','tue-09-g9'),(2,10,'math',H,'A306',18),(4,10,'systems',N,'G105',30),(12,10,'systems',M,'A303',91),
(6,11,'systems',N,'G105',48),([7,8],11,'digital',R,'G203',56),(11,11,'systems',M,'A303',86),
(4,12,'math',H,'A306',31),(7,12,'systems',N,'G105',57),(9,12,'digital',R,'G203',72),(10,12,'systems',M,'A303',80),
(5,13,'math',H,'A306',40),(8,13,'systems',N,'G105',63),(9,13,'systems',M,'A303',73),
(6,14,'math',H,'A306',49),([10,11],14,'digital',R,'G203',81),(12,14,'it',I,'G202',92),
(7,15,'math',H,'A306',58),(11,15,'it',I,'G105',87),(12,15,'digital',R,'G203',93),
(8,16,'math',H,'A305',64),(10,16,'it',I,'G105',82)]:add(g,2,h,c,t,r,cell)
# Thursday. The user explicitly clarified Group 1 IT 10-11 and Group 6 Statistics 11:30-12:30 on 2026-10-27.
for g,h,c,t,r,cell in [
(range(1,5),9,'physics',B,'G205','thu-09-g1-4'),(8,9,'it',I,'G106','thu-09-g8'),(11,9,'math',Z,'A306','thu-09-g11'),(12,9,'statistics',S,'G105','thu-09-g12'),
(range(5,9),10,'physics',B,'G205',41),(11,10,'statistics',S,'G105',88),(12,10,'math',Z,'A306',94),
(2,11,'it',I,'G106',19),(3,11,'math',Z,'A306',26),(range(9,13),11,'physics',B,'G205',74),
(range(1,5),12,'math',B,'G201',12),(5,12,'it',I,'G106',42),(10,12,'math',Z,'A306',83),
(2,13,'statistics',S,'G105',20),(3,13,'it',I,'G106',27),(range(5,9),13,'math',B,'G201',43),(9,13,'math',Z,'A306',75),
(4,14,'it',I,'G106',32),(5,14,'statistics',S,'G105',44),(range(9,13),14,'math',B,'G201',76),
(6,15,'it',I,'G106',51),(7,16,'it',I,'G106',59),(range(1,5),17,'it','Dr. Radwa Hamza','OL','thu-17-g1-4')]:add(g,4,h,c,t,r,cell)
add(1,4,10,'it',I,'G106',11)
rows[-1]['clarification']='توضيح توقيت الخلية: الخميس 10:00–11:00 في G106، وفق توضيح صاحب النسخة بتاريخ 2026-10-27.'
add(6,4,11.5,'statistics',S,'G105',50)
rows[-1]['clarification']='توضيح توقيت الخلية: الخميس 11:30–12:30 في G105، وفق توضيح صاحب النسخة بتاريخ 2026-10-27.'
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
if source.resolve()!=(ROOT/'dist/timetable-2026-2027.pdf').resolve():
 shutil.copyfile(source,ROOT/'dist/timetable-2026-2027.pdf')
meta=dict(title='Data Science Technology',university="Helwan Int’l Technological University",academicYear='2026/2027',year=1,term=1,groups=list(range(1,13)),sourceFile='timetable-2026-2027.pdf',sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),reviewedOn='2026-10-27',scopeNote='يعرض الموقع الملف المرفق فقط. أي تعديل لاحق من الجامعة يُرجع فيه إلى إعلانها الرسمي.',courses=courses,sessions=sessions)
(ROOT/'dist/timetable.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'source-audit.json').write_text(json.dumps(dict(sourceSha256=meta['sourceSha256'],sourceCells=rows),ensure_ascii=False,indent=2),encoding='utf8')
for g in range(1,13):
 a=[s for s in sessions if s['group']==g];print('Group',g,len(a),'sessions',len([s for s in a if s['issue']]),'uncertain')
