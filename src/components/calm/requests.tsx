import { useEffect, useState } from 'react';
import { getRequests, resolveRequest } from '@/lib/start.functions';
import { useCare } from '@/lib/careStore';
import { readRequest, requestCategory, requestTitle, type Request } from '@/lib/requests';
import { minutes, whenLabel } from '@/lib/week';

// Maya asks. Summer sees it here and decides with one tap. Then Dans assigns it like any task.

export function useRequests() {
  const [items, setItems] = useState<Request[]>([]);
  const pull = () => getRequests().then(setItems).catch(() => undefined);
  useEffect(() => {
    let alive = true;
    const go = () => getRequests().then(r => { if (alive) setItems(r); }).catch(() => undefined);
    go();
    const t = setInterval(go, 8000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return { items, pull };
}

const slotFor = (time: string) => (minutes(time) < 720 ? 'Morning' : minutes(time) < 1020 ? 'Afternoon' : 'Evening') as 'Morning' | 'Afternoon' | 'Evening';

export function Requests({ title = 'Maya asked' }: { title?: string }) {
  const { addDemoTask } = useCare();
  const { items, pull } = useRequests();
  const [busy, setBusy] = useState<string>();
  const [failed, setFailed] = useState(false);
  const waiting = items.filter(r => r.status === 'waiting');
  if (!waiting.length) return null;

  const decide = async (r: Request, action: 'added' | 'declined') => {
    setBusy(r.id); setFailed(false);
    try {
      let taskId: string | undefined;
      if (action === 'added') {
        const g = readRequest(r.text);
        taskId = await addDemoTask({ title: requestTitle[g.help], category: requestCategory[g.help], day: g.day, slot: slotFor(g.time), time: g.time });
      }
      const res = await resolveRequest({ data: { id: r.id, action, ...(taskId ? { taskId } : {}) } });
      if (!res.ok) setFailed(true);
      await pull();
    } catch { setFailed(true); }
    setBusy(undefined);
  };

  return (
    <section className="c-ask" aria-label="Requests from Maya">
      <div className="c-ask-top"><span className="c-eyebrow">{title}</span></div>
      {waiting.map(r => {
        const g = readRequest(r.text);
        return (
          <div key={r.id} className="c-stack">
            <h2 className="c-ask-title">{r.text}</h2>
            <p className="c-ask-body">Dans would add: {requestTitle[g.help]}, {whenLabel(g.day, g.time)}.</p>
            <div className="c-ask-actions">
              <button type="button" className="c-btn c-btn-main" disabled={busy === r.id} onClick={() => void decide(r, 'added')}>Add to the week</button>
              <button type="button" className="c-btn c-btn-white" disabled={busy === r.id} onClick={() => void decide(r, 'declined')}>Not now</button>
            </div>
          </div>
        );
      })}
      {failed && <p className="c-body" role="alert">That didn't save. Try again.</p>}
    </section>
  );
}
