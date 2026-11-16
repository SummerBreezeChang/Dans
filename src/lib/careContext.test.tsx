import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CareProvider, useCare } from './careStore';
import { CareContext, useCare as stableUseCare } from './careContext';
import { getCareSync, syncAssignments } from './careSync.functions';

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('./careSync.functions', () => ({
  getCareSync: vi.fn().mockRejectedValue(new Error('Offline test')),
  setLiveSms: vi.fn(), syncAssignments: vi.fn(),
}));
vi.mock('./wellness.functions', () => ({ escalateWellness: vi.fn() }));

afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
describe('Care context boundary', () => {
  it('shares the same stable context between the provider and consumers', () => {
    expect(useCare).toBe(stableUseCare);
    function Consumer() {
      const { state } = useCare();
      return <output>{state.people.find(p => p.id === state.activePerson)?.name}</output>;
    }
    render(<CareProvider><Consumer /></CareProvider>);
    expect(screen.getByRole('status')).toHaveTextContent('Summer Chang');
    expect(CareContext).toBeDefined();
  });
  it('restores the same ten demo tasks and primary perspective on every showcase entry', async () => {
    function Consumer() {
      const { state, update, startShowcase, liveSms } = useCare();
      return <><output>{JSON.stringify({ count: state.tasks.length, role: state.role, owner: state.tasks[0]?.owner, hospital: state.hospital, names: state.people.map(p => p.name), liveSms })}</output><button onClick={() => update(s => ({ ...s, tasks: [], role: 'Patient', hospital: 'Other' }))}>Change</button><button onClick={startShowcase}>Enter</button></>;
    }
    render(<CareProvider><Consumer /></CareProvider>);
    fireEvent.click(screen.getByText('Change'));
    expect(JSON.parse(screen.getByRole('status').textContent ?? '{}').count).toBe(0);
    fireEvent.click(screen.getByText('Enter'));
    await waitFor(() => expect(JSON.parse(screen.getByRole('status').textContent ?? '{}')).toEqual({ count: 10, role: 'Primary Caregiver', owner: 'summer', hospital: 'Kaiser Permanente', names: ['Summer Chang', 'Henry', 'Nancy', 'Jack', 'Mary', 'Karen'], liveSms: false }));
    fireEvent.click(screen.getByText('Change'));
    fireEvent.click(screen.getByText('Enter'));
    expect(JSON.parse(screen.getByRole('status').textContent ?? '{}').count).toBe(10);
    expect(syncAssignments).not.toHaveBeenCalled();
  });
  it('does not fetch remote tasks after reloading showcase mode', () => {
    localStorage.setItem('firstcare-showcase', 'true');
    render(<CareProvider><span>Demo</span></CareProvider>);
    expect(getCareSync).not.toHaveBeenCalled();
  });
});