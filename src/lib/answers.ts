// Reads a helper's answer to an ask, however they give it: a tapped choice, a thumb, or a typed word.

export type Answer = 'yes' | 'pass';

/** The two choices under every ask. Wording agreed with Summer on 2026-11-16. */
export const choices = { yes: 'Got it', pass: 'Pass it on' } as const;

const YES = /^(yes|y|yep|yeah|yup|ok|okay|sure|got it|will do|i can|i'?ll do it|i'?ll take it)\b/;
const PASS = /^(pass|no|n|nope|pass it on|change|changed)\b/;
const CANNOT = /(not free|can'?t make it|cannot make it|can ?not make it|something came up|unavailable|not available|can'?t do it|won'?t make it|busy|can'?t)/;

/** A typed reply. Returns null when it is neither a yes nor a pass, so a person can read it instead. */
export function readReply(text: string): Answer | null {
  const t = text.replace(/[’‘]/g, "'").replace(/^\s*\[to \w+\]\s*/i, '').trim().toLowerCase();
  if (!t) return null;
  if (t.startsWith('\u{1F44E}') || PASS.test(t) || CANNOT.test(t)) return 'pass';
  if (t.startsWith('\u{1F44D}') || YES.test(t)) return 'yes';
  return null;
}

/** A thumb left on the ask. Other reactions (heart, laugh) are not an answer. */
export function readThumb(type: string | null | undefined): Answer | null {
  return type === 'like' ? 'yes' : type === 'dislike' ? 'pass' : null;
}

/** A tapped choice. A choice the helper added themselves is not an answer. */
export function readChoice(text: string | null | undefined): Answer | null {
  const t = (text ?? '').trim().toLowerCase();
  return t === choices.yes.toLowerCase() ? 'yes' : t === choices.pass.toLowerCase() ? 'pass' : null;
}
