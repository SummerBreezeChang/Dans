import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CareProvider, useCare } from './careStore';
import { CareContext, useCare as stableUseCare } from './careContext';

vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('./careSync.functions', () => ({
  getCareSync: vi.fn().mockRejectedValue(new Error('Offline test')),
  setLiveSms: vi.fn(), syncAssignments: vi.fn(),
}));
vi.mock('./wellness.functions', () => ({ escalateWellness: vi.fn() }));

afterEach(cleanup);
describe('Care context boundary', () => {
  it('shares the same stable context between the provider and consumers', () => {
    expect(useCare).toBe(stableUseCare);
    function Consumer() {
      const { state } = useCare();
      return <output>{state.people.find(p => p.id === state.activePerson)?.name}</output>;
    }
    render(<CareProvider><Consumer /></CareProvider>);
    expect(screen.getByRole('status')).toHaveTextContent('Hardika Narula');
    expect(CareContext).toBeDefined();
  });
});