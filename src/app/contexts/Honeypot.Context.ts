import * as React from 'react';

import {HoneypotContextValue} from '../@types';

const HoneypotContext = React.createContext<HoneypotContextValue | null>(null);

export const HoneypotContextProvider = HoneypotContext.Provider;

export function useHoneypotContext(): HoneypotContextValue {

  const maybeContext = React.useContext(HoneypotContext);

  if (!maybeContext) throw new Error('Missing <AppContextProvider />!');

  return maybeContext;
}
