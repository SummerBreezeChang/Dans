import { describe, expect, it } from 'vitest';
import { readChoice, readReply, readThumb } from './answers';

describe('reading a helper\'s answer', () => {
  it('takes a typed yes in the ways people say it', () => {
    for (const t of ['YES', 'yes!', 'Yep', 'ok', 'Got it', 'Sure, happy to', '\u{1F44D}']) expect(readReply(t)).toBe('yes');
  });
  it('takes a typed pass, or a reason they cannot', () => {
    for (const t of ['PASS', 'no', 'Nope sorry', "I can’t make it", 'something came up', '\u{1F44E}']) expect(readReply(t)).toBe('pass');
  });
  it('leaves anything else for a person to read', () => {
    for (const t of ['', 'What time again?', 'Maybe', 'Yesterday was hard']) expect(readReply(t)).toBeNull();
  });
  it('does not read "I can\'t" as a yes', () => {
    expect(readReply("ok but I can't drive")).toBe('pass');
  });
  it('reads thumbs only', () => {
    expect(readThumb('like')).toBe('yes');
    expect(readThumb('dislike')).toBe('pass');
    expect(readThumb('love')).toBeNull();
  });
  it('reads the two choices, and ignores one the helper added', () => {
    expect(readChoice('Got it')).toBe('yes');
    expect(readChoice('Pass it on')).toBe('pass');
    expect(readChoice('Maybe Friday')).toBeNull();
  });
});

import { readEvent } from './linqWebhook.server';

describe('reading what Linq sends', () => {
  const text = async () => 'Got it';
  it('reads a tapped choice', async () => {
    const e = await readEvent({ event_type: 'poll.vote.added', data: { message_id: 'm1', option_id: 'o1', sender_handle: { handle: '+14155550100' } } }, text);
    expect(e).toMatchObject({ from: '+14155550100', messageId: 'm1', answer: 'yes' });
  });
  it('does not act on a choice the helper added', async () => {
    const e = await readEvent({ event_type: 'poll.vote.added', data: { message_id: 'm1', option_id: 'o9', sender_handle: { handle: '+14155550100' } } }, async () => 'Maybe Friday');
    expect(e.answer).toBeNull();
  });
  it('reads a thumbs down on the question as a pass', async () => {
    const e = await readEvent({ event_type: 'reaction.added', data: { message_id: 'm2', reaction_type: 'dislike', is_from_me: false, from: '+14155550100' } }, text);
    expect(e).toMatchObject({ messageId: 'm2', answer: 'pass' });
  });
  it('reads a typed YES', async () => {
    const e = await readEvent({ event_type: 'message.received', data: { sender_handle: { handle: '+14155550100' }, parts: [{ type: 'text', value: 'YES' }] } }, text);
    expect(e).toMatchObject({ messageId: null, answer: 'yes' });
  });
  it('ignores our own messages and other events', async () => {
    expect((await readEvent({ event_type: 'message.received', data: { direction: 'outbound', parts: [] } }, text)).from).toBeNull();
    expect((await readEvent({ event_type: 'message.delivered', data: {} }, text)).from).toBeNull();
  });
});
