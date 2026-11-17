// Writes one row per answer a person gives by text. Fails quietly if the care_answers table does not exist yet,
// so replies keep working before the migration is applied.

export interface AnswerRow {
  personId: string;
  taskId?: string | undefined;
  answer: 'yes' | 'pass' | 'other';
  via: 'thumb' | 'typed' | 'choice';
  note?: string | undefined;
}

/** How the person answered, from the Linq event type. */
export const viaFor = (eventType: string): AnswerRow['via'] =>
  eventType === 'message.received' ? 'typed' : eventType === 'poll.vote.added' ? 'choice' : 'thumb';

export async function recordAnswer(db: { from: (t: string) => any }, row: AnswerRow): Promise<boolean> {
  try {
    const { error } = await db.from('care_answers').insert({ person_id: row.personId, task_id: row.taskId ?? null, answer: row.answer, via: row.via, note: row.note?.slice(0, 200) ?? null });
    return !error;
  } catch {
    return false;
  }
}
