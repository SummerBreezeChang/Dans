import { createElement, createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getCareSync, setLiveSms, syncAssignments } from './careSync.functions';
import { assignTasks, declineTask, rescheduleTasks, type CareTask, type Caregiver, type Role, type Category } from './assignmentEngine';
export const categories: Category[] = ['Appointment Management', 'Follow-ups', 'At-Home Care', 'Meal Planning', 'Medicine Pickup', 'Rides to & from Appointments', 'Emergency Contacts'];
export const initialPeople: Caregiver[] = [
 {id:'david',name:'David Lin',initials:'DL',role:'Primary Caregiver',visibility:'Full medical details',cap:5,availability:['0-Morning','0-Evening','1-Morning','1-Evening','2-Morning','2-Evening','3-Morning','3-Evening','4-Evening','5-Morning','5-Afternoon','6-Morning']},
 {id:'priya',name:'Priya Patel',initials:'PP',role:'Secondary Caregiver',visibility:'Task-only',cap:5,availability:['0-Afternoon','1-Afternoon','2-Morning','2-Afternoon','3-Afternoon','4-Afternoon','4-Evening','5-Evening','6-Afternoon']},
 {id:'marcus',name:'Marcus Vance',initials:'MV',role:'Secondary Caregiver',visibility:'Task-only',cap:5,availability:['0-Evening','1-Morning','2-Evening','3-Morning','3-Afternoon','3-Evening','4-Morning','4-Afternoon','5-Morning','6-Evening']},
];
export function generateCareChecklist(): CareTask[] {
 const rows: [string, Category, number, 'Morning'|'Afternoon'|'Evening', string, number, string|undefined, string|undefined, CareTask['status']][] = [
 ['Ride to chemotherapy','Rides to & from Appointments',3,'Morning','9:00 AM',60,'chemo','david','accepted'],
 ['Prepare a post-chemo meal','Meal Planning',3,'Evening','6:00 PM',45,'chemo','priya','assigned'],
 ['Pick up prescriptions','Medicine Pickup',3,'Afternoon','12:30 PM',30,'chemo',undefined,'unclaimed'],
 ['Ride to blood draw','Rides to & from Appointments',2,'Morning','7:45 AM',45,'labs','priya','accepted'],
 ['Confirm oncology follow-up','Appointment Management',0,'Morning','10:00 AM',15,undefined,'david','done'],
 ['Check in with Maya','At-Home Care',4,'Evening','7:00 PM',20,undefined,'marcus','assigned'],
 ['Prepare meals for the weekend','Meal Planning',5,'Morning','11:00 AM',60,undefined,undefined,'unclaimed'],
 ['Collect questions for the oncologist','Follow-ups',2,'Evening','6:00 PM',20,'oncology','david','assigned'],
 ['Update emergency contact list','Emergency Contacts',1,'Morning','10:00 AM',15,undefined,'marcus','done'],
 ['Set up a comfortable recovery space','At-Home Care',3,'Morning','8:00 AM',30,undefined,undefined,'unclaimed'],
 ];
 return rows.map((r,i) => ({id:`task-${i+1}`,title:r[0],category:r[1],day:r[2],slot:r[3],time:r[4],duration:r[5],appointment:r[6],owner:r[7],status:r[8],approved:true,published:true,notes:'Coordinate with Maya before the task. Follow the care team’s instructions.'}));
}
export interface Activity {id:string; title:string; detail:string; time:string}
export interface CareState { role: Role; activePerson: string; people: Caregiver[]; tasks: CareTask[]; consent: boolean; connected: boolean; hospital: string; rescheduled: boolean; activities: Activity[]; refusals: {task:string; person:string; reason:string}[]; sharing: Record<string,boolean> }
const freshState = (): CareState => ({role:'Primary Caregiver',activePerson:'david',people:structuredClone(initialPeople),tasks:generateCareChecklist(),consent:true,connected:true,hospital:'Kaiser Permanente',rescheduled:false,activities:[{id:'a1',title:'Priya accepted a task',detail:'Ride to blood draw · Wednesday',time:'24 min ago'},{id:'a2',title:'Your care plan is ready',detail:'10 tasks shared with the care circle',time:'1 hour ago'},{id:'a3',title:'Hospital record connected',detail:'Kaiser Permanente · Demo import',time:'2 hours ago'}],refusals:[],sharing:{Sleep:true,Steps:true,'Heart rate':false}});
interface CareContextValue {state:CareState; update:(fn:(s:CareState)=>CareState)=>void; reset:()=>void; autoAssign:()=>void; decline:(id:string,reason:string)=>void; reschedule:()=>void; addActivity:(title:string,detail:string)=>void; liveSms:boolean; setLive:(v:boolean)=>void}
const CareContext = createContext<CareContextValue|undefined>(undefined);
export function CareProvider({children}:{children:ReactNode}) {
 const [state,setState] = useState<CareState>(freshState);
 const [loaded,setLoaded] = useState(false);
 useEffect(()=> {try {const saved=localStorage.getItem('firstcare-demo-v1'); if(saved) {const parsed=JSON.parse(saved); if(Array.isArray(parsed.tasks)&&Array.isArray(parsed.people)&&parsed.sharing) setState(parsed);}} catch { /* Demo can run without browser storage. */ } setLoaded(true);},[]);
 useEffect(()=>{if(loaded) localStorage.setItem('firstcare-demo-v1',JSON.stringify(state));},[state,loaded]);
  const [liveSms,setLiveState]=useState(true);
  const owners=useRef<Record<string,string|undefined>|null>(null);
  const remoteSeen=useRef(new Set<string>());
  useEffect(()=>{if(!loaded)return;let alive=true;const pull=async()=>{try{const r=await getCareSync();if(!alive)return;setLiveState(r.liveSms);setState(s=>{const tasks=s.tasks.map(t=>{const row=r.tasks.find(x=>x.id===t.id);if(!row||(row.owner??undefined)===t.owner&&row.status===t.status)return t;return {...t,owner:row.owner??undefined,status:row.status as CareTask['status'],declinedBy:row.declined_by,updated:true};});const fresh=r.activity.filter(a=>!remoteSeen.current.has(a.id)&&!s.activities.some(x=>x.id===a.id));fresh.forEach(a=>remoteSeen.current.add(a.id));owners.current=Object.fromEntries(tasks.map(t=>[t.id,t.owner]));return {...s,tasks,activities:[...fresh.map(a=>({id:a.id,title:a.title,detail:a.detail,time:new Date(a.created_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})})),...s.activities]};});}catch{/* keep local demo */}};pull();const t=setInterval(pull,10000);return()=>{alive=false;clearInterval(t);};},[loaded]);
  useEffect(()=>{if(!loaded)return;const now=Object.fromEntries(state.tasks.map(t=>[t.id,t.owner]));const prev=owners.current;owners.current=now;if(!prev)return;const changes=state.tasks.filter(t=>t.published&&prev[t.id]!==t.owner).map(t=>({id:t.id,owner:t.owner??null,status:t.status,event:(prev[t.id]?'reassigned':'assigned') as 'assigned'|'reassigned'}));if(changes.length)syncAssignments({data:{changes}}).catch(()=>{});},[state.tasks,loaded]);
  const setLive=(v:boolean)=>{setLiveState(v);setLiveSms({data:{live:v}}).catch(()=>{});};
  const update=(fn:(s:CareState)=>CareState)=>setState(fn);
 const activity=(title:string,detail:string):Activity=>({id:crypto.randomUUID(),title,detail,time:'Just now'});
 const addActivity=(title:string,detail:string)=>update(s=>({...s,activities:[activity(title,detail),...s.activities]}));
 const autoAssign=()=>update(s=>({...s,tasks:assignTasks(s.tasks,s.people),activities:[activity('Tasks balanced across your circle','Available caregivers received unclaimed tasks.'),...s.activities]}));
 const decline=(id:string,reason:string)=>update(s=>{const task=s.tasks.find(t=>t.id===id); if(!task?.owner) return s; return {...s,tasks:declineTask(s.tasks,s.people,id,task.owner),refusals:[...s.refusals,{task:task.title,person:task.owner,reason}],activities:[activity('A task was reassigned','The care circle’s availability was checked.'),...s.activities]};});
 const reschedule=()=>update(s=>({...s,rescheduled:true,tasks:rescheduleTasks(s.tasks,s.people),activities:[activity('Chemotherapy appointment rescheduled','Thursday 10:00 AM → Friday 2:00 PM. Dependent tasks updated and conflicts reassigned.'),...s.activities]}));
 return createElement(CareContext.Provider, {value:{state,update,reset:()=>setState(freshState()),autoAssign,decline,reschedule,addActivity,liveSms,setLive}}, children);
}
export function useCare(){const context=useContext(CareContext);if(!context)throw new Error('CareProvider is required');return context;}
export function notificationPreview(){return 'Your care circle has an update. Sign in securely to review: https://firstcare.example/sign-in';}
