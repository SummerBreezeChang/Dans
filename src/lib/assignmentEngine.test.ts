import { describe,it,expect } from 'vitest';
import {assignTasks,declineTask,rescheduleTasks,canViewMedical,type CareTask} from './assignmentEngine';
import {generateCareChecklist,initialPeople,notificationPreview} from './careStore';
describe('Care assignment rules',()=>{
 it('uses a default five-task weekly cap for all three caregivers',()=>{expect(initialPeople.map(p=>p.cap)).toEqual([5,5,5]);});
 it('respects availability and weekly caps',()=>{const tasks=generateCareChecklist().map(t=>({...t,owner:undefined,status:'unclaimed' as const}));const people=initialPeople.map(p=>({...p,cap:1}));const result=assignTasks(tasks,people);for(const p of people){const owned=result.filter(t=>t.owner===p.id);expect(owned.length).toBeLessThanOrEqual(1);for(const t of owned)expect(p.availability).toContain(`${t.day}-${t.slot}`);}expect(result.some(t=>t.owner)).toBe(true);});
 it('preserves caregiver sign-ups',()=>{const tasks=generateCareChecklist();expect(assignTasks(tasks,initialPeople).find(t=>t.id==='task-1')?.owner).toBe('david');});
 it('decline immediately reassigns to a different available person',()=>{const result=declineTask(generateCareChecklist(),initialPeople,'task-1','david');expect(result[0]?.owner).toBe('marcus');expect(result[0]?.updated).toBe(true);});
 it('balances equally available people by current count',()=>{const people=initialPeople.map(p=>({...p,availability:['0-Morning']}));const tasks:CareTask[]=generateCareChecklist().slice(0,6).map(t=>({...t,day:0,slot:'Morning',owner:undefined,status:'unclaimed'}));const result=assignTasks(tasks,people);expect(people.map(p=>result.filter(t=>t.owner===p.id).length)).toEqual([2,2,2]);});
 it('moves all chemo dependencies to Friday and reassigns conflicts',()=>{const moved=rescheduleTasks(generateCareChecklist(),initialPeople);for(const t of moved.filter(t=>t.appointment==='chemo'))expect(t.day).toBe(4);expect(moved[0]?.slot).toBe('Afternoon');expect(moved[0]?.owner).not.toBe('david');expect(moved[1]?.time).toBe('6:00 PM');});
 it('notifications omit patient and medical details',()=>{const text=notificationPreview();expect(text).toContain('https://firstcare.example/sign-in');expect(text).not.toMatch(/Maya|chemo|cancer|medication|hospital/i);});
});

describe('Medical visibility',()=>{
 it('keeps task-only secondary caregivers out of the medical record',()=>{expect(canViewMedical('Secondary Caregiver',initialPeople[1])).toBe(false);});
 it('allows explicitly approved full medical access',()=>{const person=initialPeople[1];if(!person)throw new Error('Missing Priya');expect(canViewMedical('Secondary Caregiver',{...person,visibility:'Full medical details'})).toBe(true);});
 it('allows patient and primary caregiver medical access',()=>{expect(canViewMedical('Patient',undefined)).toBe(true);expect(canViewMedical('Primary Caregiver',initialPeople[0])).toBe(true);});
});
