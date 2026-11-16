import { type ReactNode } from 'react';
import { Heart, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useCare } from '@/lib/careStore';
import { days, type CareTask } from '@/lib/assignmentEngine';
import { Button } from '@/components/ui/button';
export function PageHeading({eyebrow='MAYA’S CARE SPACE',title,description,action}:{eyebrow?:string;title:string;description:string;action?:ReactNode}){return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>}
export function Avatar({id='summer',size='normal'}:{id?:string;size?:'normal'|'small'}){const {state}=useCare();const person=state.people.find(p=>p.id===id);return <span className={`person-avatar person-${id} ${size==='small'?'avatar-small':''}`}>{person?.initials??'ML'}</span>}
export function StatusBadge({status}:{status:CareTask['status']}){return <span className={`status-badge status-${status}`}><span/>{status==='assigned'?'Pending acceptance':status==='accepted'?'Accepted':status==='done'?'Completed':'Needs a helping hand'}</span>}
export function Disclaimer(){return <div className="disclaimer"><ShieldCheck size={16}/><span><strong>Not medical advice.</strong> FirstCare+ coordinates logistics only. Suggested tasks require human review.</span></div>}
export function Empty({children}:{children:ReactNode}){return <div className="empty-state"><Heart size={24}/><p>{children}</p></div>}
export function TaskTime({task}:{task:CareTask}){return <span>{days[task.day]}, {task.time} <span className="text-muted-foreground">· {task.duration} min</span></span>}
export function IconAction({onClick,children,label}:{onClick:()=>void;children:ReactNode;label:string}){return <Button size="icon" variant="ghost" title={label} aria-label={label} onClick={onClick}>{children??<ArrowUpRight/>}</Button>}
