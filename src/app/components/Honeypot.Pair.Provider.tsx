import * as React from 'react';

import {HoneypotPairContextValue} from '../@types';
import {HoneypotPairContextProvider} from '../contexts';
import {useCreateHoneypotPair, useHoneypotPairRemoveInitialLiquidity} from '../hooks';

export const HoneypotPairProvider = React.memo(
  function HoneypotPairProvider({
    children,
  }: React.PropsWithChildren): JSX.Element {
    const honeypotPairCreateResult = useCreateHoneypotPair();

    const {removeInitialLiquidity} = useHoneypotPairRemoveInitialLiquidity({
      honeypotPairCreateResult,
    });

    return (
      <HoneypotPairContextProvider
        children={children}
        value={React.useMemo<HoneypotPairContextValue>(
          () => ({...honeypotPairCreateResult, removeInitialLiquidity}),
          [honeypotPairCreateResult, removeInitialLiquidity]
        )}
      />
    );
  }
);
