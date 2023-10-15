import * as React from 'react';

import {HoneypotPairContextValue} from '../@types';

const HoneypotPairContext = React.createContext<HoneypotPairContextValue | null>(null);

export const HoneypotPairContextProvider = HoneypotPairContext.Provider;

export function useHoneypotPairContext(): HoneypotPairContextValue {

  const maybeContext = React.useContext(HoneypotPairContext);

  if (!maybeContext) throw new Error('Missing <HoneypotPairContextProvider />!');

  return maybeContext;
}
