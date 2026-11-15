import { createContext, useContext } from 'react';
import type { CareContextValue } from './careStore';

// Keep the context in a stable module, separate from the hot-reloaded provider.
export const CareContext = createContext<CareContextValue | undefined>(undefined);

export function useCare() {
  const context = useContext(CareContext);
  if (!context) throw new Error('CareProvider is required');
  return context;
}