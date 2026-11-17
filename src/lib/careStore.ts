import { createElement, useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { CareContext } from './careContext';
export { useCare } from './careContext';
import { getCareSync, saveWeek, setLiveSms, syncAssignments } from './careSync.functions';
import { saveLead } from './start.functions';
import { demoTasks, fits, nextOpen, visitIds } from './weekPlan';
import { useServerFn } from '@tanstack/react-start';
import { escalateWellness } from './wellness.functions';
import { defaultSharing, wellnessTask, type Insight, type WellnessScenario } from './wellnessEngine';
import { assignTasks, declineTask, rescheduleTasks, type CareTask, type Caregiver, type Role, type Category } from './assignmentEngine';
export const categories: Category[] = ['Appointment Management', 'Follow-ups', 'At-Home Care', 'Meal Planning', 'Medicine Pickup', 'Rides to & from Appointments', 'Emergency Contacts'];
export const initialPeople: Caregiver[] = [
 {id:'summer',name:'Summer Chang',initials:'SC',role:'Primary Caregiver',visibility:'Full medical details',cap:5,availability:['0-Morning','0-Evening','1-Morning','1-Evening','2-Morning','2-Evening','3-Morning','3-Evening','4-Evening','5-Morning','5-Afternoon','6-Morning']},
 {id:'henry',name:'Henry',initials:'H',role:'Secondary Caregiver',visibility:'Task-only',cap:5,availability:['0-Afternoon','1-Afternoon','2-Morning','2-Afternoon','3-Afternoon','4-Afternoon','4-Evening','5-Evening','6-Afternoon']},
 {id:'nancy',name:'Nancy',initials:'N',role:'Secondary Caregiver',visibility:'Task-only',cap:5,availability:['0-Evening','1-Morning','2-Evening','3-Morning','3-Afternoon','3-Evening','4-Morning','4-Afternoon','5-Morning','6-Evening']},
 {id:'jack',name:'Jack',initials:'J',role:'Secondary Caregiver',visibility:'Task-only',cap:5,availability:['1-Evening','3-Evening','5-Morning','5-Afternoon','6-Morning','6-Afternoon'],helps:['Rides','Pickups']},
 {id:'mary',name:'Mary',initials:'M',role:'Secondary Caregiver',visibility:'Task-only',cap:5,availability:['0-Morning','2-Morning','4-Morning','4-Afternoon','4-Evening'],helps:['Meals','At home','Calls and paperwork']},
 {id:'karen',name:'Karen',initials:'K',role:'Secondary Caregiver',visibility:'Task-only',cap:5,availability:['1-Afternoon','3-Afternoon','5-Evening','6-Evening'],helps:['Meals','At home']},
];
export function generateCareChecklist(): CareTask[] {
 const rows: [string, Category, number, 'Morning'|'Afternoon'|'Evening', string, number, string|undefined, string|undefined, CareTask['status']][] = [
 ['Ride to chemotherapy','Rides to & from Appointments',3,'Morning','9:00 AM',60,'chemo','summer','accepted'],
 ['Prepare a post-chemo meal','Meal Planning',3,'Evening','6:00 PM',45,'chemo','henry','assigned'],
 ['Pick up prescriptions','Medicine Pickup',3,'Afternoon','12:30 PM',30,'chemo',undefined,'unclaimed'],
 ['Ride to blood draw','Rides to & from Appointments',2,'Morning','7:45 AM',45,'labs','henry','accepted'],
 ['Confirm oncology follow-up','Appointment Management',0,'Morning','10:00 AM',15,undefined,'summer','done'],
 ['Check in with Maya','At-Home Care',4,'Evening','7:00 PM',20,undefined,'nancy','assigned'],
 ['Prepare meals for the weekend','Meal Planning',5,'Morning','11:00 AM',60,undefined,undefined,'unclaimed'],
 ['Collect questions for the oncologist','Follow-ups',2,'Evening','6:00 PM',20,'oncology','summer','assigned'],
 ['Update emergency contact list','Emergency Contacts',1,'Morning','10:00 AM',15,undefined,'nancy','done'],
 ['Set up a comfortable recovery space','At-Home Care',3,'Morning','8:00 AM',30,undefined,undefined,'unclaimed'],
 ];
 return rows.map((r,i) => ({id:`task-${i+1}`,title:r[0],category:r[1],day:r[2],slot:r[3],time:r[4],duration:r[5],appointment:r[6],owner:r[7],status:r[8],approved:true,published:true,notes:'Coordinate with Maya before the task. Follow the care team’s instructions.'}));
}
export interface Activity {id:string; title:string; detail:string; time:string}
export interface CareState { role: Role; activePerson: string; people: Caregiver[]; tasks: CareTask[]; consent: boolean; connected: boolean; hospital: string; rescheduled: boolean; confirmed: boolean; named: boolean; owner?: 'patient'|'caretaker'; patientName?: string; activities: Activity[]; refusals: {task:string; person:string; reason:string}[]; sharing: Record<string,boolean>; wellnessScenario?: WellnessScenario }
const freshState = (): CareState => ({role:'Primary Caregiver',activePerson:'summer',people:structuredClone(initialPeople),tasks:demoTasks(visitIds, false),consent:true,connected:true,hospital:'Kaiser Permanente',rescheduled:false,confirmed:false,named:false,activities:[],refusals:[],sharing:{...defaultSharing},wellnessScenario:'baseline'});
export interface CareContextValue {state:CareState; update:(fn:(s:CareState)=>CareState)=>void; reset:()=>void; startShowcase:()=>void; autoAssign:()=>void; decline:(id:string,reason:string)=>void; reschedule:()=>void; addActivity:(title:string,detail:string)=>void; liveSms:boolean; setLive:(v:boolean)=>void; createWellnessTask:(insight:Insight)=>Promise<string>; confirmWeek:(kept:string[])=>Promise<void>; askPerson:(taskId:string,personId:string)=>void; takeTask:(taskId:string)=>void; releaseTask:(taskId:string)=>void; addDemoTask:(task:Pick<CareTask,'title'|'category'|'day'|'slot'|'time'|'appointment'>)=>Promise<string>; nameLead:(name:string,phone:string)=>Promise<void>; setOwner:(owner:'patient'|'caretaker'|undefined)=>void; setPatient:(name:string|undefined)=>void; unname:()=>void}
export function CareProvider({children}:{children:ReactNode}) {
 const escalate = useServerFn(escalateWellness);
 const persistWeek = useServerFn(saveWeek);
 const persistLead = useServerFn(saveLead);
 const [state,setState] = useState<CareState>(freshState);
 const [loaded,setLoaded] = useState(false);
 const [showcase,setShowcase] = useState(false);
 const showcaseRef=useRef(false);
 useEffect(()=> {try {showcaseRef.current=localStorage.getItem('firstcare-showcase')==='true';setShowcase(showcaseRef.current);if(showcaseRef.current)setLiveState(false);const saved=localStorage.getItem('firstcare-demo-v2'); if(saved) {const parsed=JSON.parse(saved); if(Array.isArray(parsed.tasks)&&Array.isArray(parsed.people)&&parsed.sharing) setState({...freshState(),...parsed,confirmed:parsed.confirmed===true,named:parsed.named===true,sharing:parsed.wellnessScenario?{...defaultSharing,...parsed.sharing}:{...defaultSharing,...parsed.sharing,'Heart rate':true},wellnessScenario:parsed.wellnessScenario??'baseline'});}} catch { /* Demo can run without browser storage. */ } setLoaded(true);},[]);
  useEffect(()=>{if(loaded) {try {localStorage.setItem('firstcare-demo-v2',JSON.stringify(state));}catch{/* Storage may be disabled. */}}},[state,loaded]);
  const [liveSms,setLiveState]=useState(true);
  const owners=useRef<Record<string,{owner:string|undefined;when:string}>|null>(null);
  const remoteSeen=useRef(new Set<string>());
  useEffect(()=>{if(!loaded||showcaseRef.current)return;let alive=true;const pull=async()=>{try{const r=await getCareSync();if(!alive||showcaseRef.current)return;setLiveState(r.liveSms);setState(s=>{const tasks=s.tasks.map(t=>{const row=r.tasks.find(x=>x.id===t.id);if(!row||(row.owner??undefined)===t.owner&&row.status===t.status)return t;return {...t,owner:row.owner??undefined,status:row.status as CareTask['status'],declinedBy:row.declined_by,updated:true};});const remoteWellness=r.tasks.filter(row=>row.id.startsWith('wellness-')&&!tasks.some(t=>t.id===row.id)).map(row=>({id:row.id,title:row.title,day:row.day,slot:(row.slot==='Morning'||row.slot==='Afternoon'?row.slot:'Evening') as CareTask['slot'],time:row.time,published:row.published,owner:row.owner??undefined,status:row.status as CareTask['status'],category:'At-Home Care' as const,duration:20,approved:true,notes:'Wellness coordination check-in.',priority:(row.id==='wellness-cardio'?'urgent':'high') as 'urgent'|'high'}));tasks.push(...remoteWellness);const fresh=r.activity.filter(a=>!remoteSeen.current.has(a.id)&&!s.activities.some(x=>x.id===a.id));fresh.forEach(a=>remoteSeen.current.add(a.id));owners.current=Object.fromEntries(tasks.map(t=>[t.id,{owner:t.owner,when:`${t.day}-${t.time}`}]));return {...s,tasks,activities:[...fresh.map(a=>({id:a.id,title:a.title,detail:a.detail,time:new Date(a.created_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})})),...s.activities]};});}catch{/* keep local demo */}};pull();const t=setInterval(pull,10000);return()=>{alive=false;clearInterval(t);};},[loaded,showcase]);
  useEffect(()=>{if(!loaded||showcaseRef.current)return;const now:Record<string,{owner:string|undefined;when:string}>={};for(const t of state.tasks)now[t.id]={owner:t.owner,when:`${t.day}-${t.time}`};const prev=owners.current;owners.current=now;if(!prev)return;const changes=state.tasks.flatMap(t=>{const was=prev[t.id];if(!t.published||!was)return [];const ownerChanged=was.owner!==t.owner;if(!ownerChanged&&was.when===`${t.day}-${t.time}`)return [];const event:'assigned'|'reassigned'|'moved'=ownerChanged?(was.owner?'reassigned':'assigned'):'moved';return [{id:t.id,owner:t.owner??null,status:t.status,day:t.day,slot:t.slot,time:t.time,event}];});if(changes.length)syncAssignments({data:{changes}}).catch(()=>{});},[state.tasks,loaded,showcase]);
  const setLive=(v:boolean)=>{if(showcaseRef.current){setLiveState(false);return;}setLiveState(v);setLiveSms({data:{live:v}}).catch(()=>{});};
  const startShowcase=()=>{showcaseRef.current=true;setShowcase(true);setLiveState(false);owners.current=null;setState(freshState());try{localStorage.setItem('firstcare-showcase','true');localStorage.setItem('firstcare-demo-v2',JSON.stringify(freshState()));}catch{/* Showcase works without storage. */}};
  const rowOf = (t: CareTask) => ({ id: t.id, title: t.title, category: t.category, day: t.day, slot: t.slot, time: t.time, published: t.published, owner: t.owner ?? null, status: t.status });
  const confirmWeek = async (kept: string[]) => {
    const tasks = demoTasks(kept, true);
    try { await persistWeek({ data: { tasks: tasks.map(rowOf) } }); } catch { /* The week still shows here. */ }
    update(s => ({ ...s, confirmed: true, tasks: [...tasks, ...s.tasks.filter(t => t.appointment === 'extra')] }));
  };
  const askPerson = (taskId: string, personId: string) => update(s => ({ ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, owner: personId, status: 'assigned' as const, updated: true } : t) }));
  const takeTask = (taskId: string) => update(s => {
    let tasks = s.tasks.map(t => t.id === taskId ? { ...t, owner: 'summer', status: 'accepted' as const, updated: true } : t);
    const nxt = nextOpen(tasks);
    const who = nxt ? fits(nxt, tasks, s.people)[0] : undefined;
    if (nxt && who) tasks = tasks.map(t => t.id === nxt.id ? { ...t, owner: who.id, status: 'assigned' as const, updated: true } : t);
    return { ...s, tasks };
  });
  const releaseTask = (taskId: string) => update(s => {
    const task = s.tasks.find(t => t.id === taskId);
    if (!task?.owner) return s;
    const declined = [...(task.declinedBy ?? []), task.owner];
    const cleared = s.tasks.map(t => t.id === taskId ? { ...t, owner: undefined, status: 'unclaimed' as const, declinedBy: declined, updated: true } : t);
    const current = cleared.find(t => t.id === taskId)!;
    const who = fits(current, cleared, s.people)[0];
    const tasks = who ? cleared.map(t => t.id === taskId ? { ...t, owner: who.id, status: 'assigned' as const } : t) : cleared;
    return { ...s, tasks };
  });
  const addDemoTask = async (task: Pick<CareTask, 'title' | 'category' | 'day' | 'slot' | 'time' | 'appointment'>) => {
    const id = `task-${Date.now() % 10000}`;
    const created: CareTask = { id, ...task, duration: 30, status: 'unclaimed', approved: true, published: true, notes: '' };
    update(s => ({ ...s, tasks: [...s.tasks, { ...created, published: s.confirmed }] }));
    try { await persistWeek({ data: { tasks: [rowOf({ ...created, published: true })] } }); } catch { /* It stays on this phone. */ }
    return id;
  };
  const setOwner = (owner: 'patient' | 'caretaker' | undefined) => update(s => { const { owner: _o, ...rest } = s; return (owner ? { ...rest, owner } : rest) as CareState; });
  const setPatient = (name: string | undefined) => update(s => { const { patientName: _p, ...rest } = s; return (name ? { ...rest, patientName: name } : rest) as CareState; });
  const unname = () => update(s => ({ ...s, named: false }));
  const nameLead = async (name: string, phone: string) => {
    update(s => ({ ...s, named: true, people: s.people.map(p => p.id === 'summer' ? { ...p, name, initials: name.slice(0, 2).toUpperCase() } : p) }));
    try { await persistLead({ data: { name, phone } }); } catch { /* The name is kept on this phone. */ }
  };
  const update=(fn:(s:CareState)=>CareState)=>setState(fn);
 const activity=(title:string,detail:string):Activity=>({id:crypto.randomUUID(),title,detail,time:'Just now'});
 const addActivity=(title:string,detail:string)=>update(s=>({...s,activities:[activity(title,detail),...s.activities]}));
 const autoAssign=()=>update(s=>({...s,tasks:assignTasks(s.tasks,s.people),activities:[activity('Tasks balanced across your circle','Available caregivers received unclaimed tasks.'),...s.activities]}));
 const decline=(id:string,reason:string)=>update(s=>{const task=s.tasks.find(t=>t.id===id); if(!task?.owner) return s; return {...s,tasks:declineTask(s.tasks,s.people,id,task.owner),refusals:[...s.refusals,{task:task.title,person:task.owner,reason}],activities:[activity('A task was reassigned','The care circle’s availability was checked.'),...s.activities]};});
 const reschedule=()=>update(s=>({...s,rescheduled:true,tasks:rescheduleTasks(s.tasks,s.people),activities:[activity('Chemotherapy appointment rescheduled','Thursday 10:00 AM → Friday 2:00 PM. Dependent tasks updated and conflicts reassigned.'),...s.activities]}));
 const createWellnessTask=async(insight:Insight)=>{
   const now=new Date();const task=wellnessTask(insight,(now.getDay()+6)%7,now.getHours()<12?'Morning':now.getHours()<17?'Afternoon':'Evening');
   update(s=>s.tasks.some(t=>t.id===task.id)?s:{...s,tasks:[task,...s.tasks],activities:[activity('Wellness check-in added','A simulated wellness alert created a care coordination task.'),...s.activities]});
   if(showcaseRef.current)return 'Task saved · SMS simulated';
   try {const result=await escalate({data:{scenario:state.wellnessScenario??'baseline',insight:insight.id,sharing:state.sharing}});
     return result.mode==='demo'?'Task saved · SMS simulated':result.mode==='unconfigured'?'Task saved · SMS service needs configuration':result.failed?'Task saved · some SMS alerts could not be sent':result.sent?`Task saved · ${result.sent} SMS alert accepted`:'Task saved · no new SMS recipients';
   } catch {return 'Added to this care board · sign-in required to sync and send live SMS';}
 };
  const displayState=useMemo(()=>{
    const rename=(text:string)=>text.replace(/\bPriya Patel\b/g,'Henry').replace(/\bDavid Lin\b/g,'Summer Chang').replace(/\bMarcus Vance\b/g,'Nancy').replace(/\bPriya\b/g,'Henry').replace(/\bDavid\b/g,'Summer').replace(/\bMarcus\b/g,'Nancy');
    return {...state,people:state.people.map(person=>{const identity=initialPeople.find(p=>p.id===person.id);return identity?{...person,name:identity.name,initials:identity.initials}:person;}),tasks:state.tasks.map(task=>({...task,title:rename(task.title),notes:rename(task.notes)})),activities:state.activities.map(a=>({...a,title:rename(a.title),detail:rename(a.detail)})),refusals:state.refusals.map(r=>({...r,task:rename(r.task),reason:rename(r.reason)}))};
  },[state]);
  return createElement(CareContext.Provider, {value:{state:displayState,update,reset:()=>setState(freshState()),startShowcase,autoAssign,decline,reschedule,addActivity,liveSms,setLive,createWellnessTask,confirmWeek,askPerson,takeTask,releaseTask,addDemoTask,nameLead,setOwner,setPatient,unname}}, children);
}
export function notificationPreview(){return 'Your care circle has an update. Sign in securely to review: https://firstcare.example/sign-in';}
