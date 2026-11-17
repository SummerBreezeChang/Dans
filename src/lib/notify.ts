// What Summer is texted about, and what Dans does when a helper passes.
// Saved as an entry in the activity log (the newest one wins), so no new table is needed.

export interface Prefs {
  /** 'auto': Dans asks the next free person itself. 'check': Dans asks Summer first. */
  pass: 'auto' | 'check';
  /** Text Summer when nobody is free for a task. */
  nobody: boolean;
  /** Text Summer each time a helper passes. */
  passed: boolean;
}

export const defaultPrefs: Prefs = { pass: 'auto', nobody: true, passed: false };
export const prefsTitle = 'Notification settings';

export function parsePrefs(detail: string | null | undefined): Prefs {
  try {
    const j = JSON.parse(detail ?? '');
    return { pass: j.pass === 'check' ? 'check' : 'auto', nobody: j.nobody !== false, passed: j.passed === true };
  } catch {
    return defaultPrefs;
  }
}
