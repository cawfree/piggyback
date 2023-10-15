import * as React from 'react';
import {HDNodeWallet, JsonRpcProvider} from 'ethers';

import {Resumable} from '../../@types';

import {HoneypotContextValue} from '../@types';
import {HoneypotContextProvider} from '../contexts';
import {useCreateHoneypot} from '../hooks';

export const HoneypotProvider = React.memo(
  function HoneypotProvider({
    children,
    exitWallet,
    resumable,
    honeypotDeployer,
    provider,
  }: React.PropsWithChildren<{
    readonly exitWallet: HDNodeWallet;
    readonly resumable: Resumable;
    readonly honeypotDeployer: HDNodeWallet;
    readonly provider: JsonRpcProvider;
  }>): JSX.Element {
    const honeypotContractState = useCreateHoneypot({
      exitWallet,
      resumable,
      honeypotDeployer,
      provider,
    });
    return (
      <HoneypotContextProvider
        children={children}
        value={React.useMemo<HoneypotContextValue>(
          () => ({
            exitWallet,
            resumable,
            honeypotContractState,
            honeypotDeployer,
            provider,
          }),
          [
            exitWallet,
            resumable,
            honeypotContractState,
            honeypotDeployer,
            provider,
          ]
        )}
      />
    );
  }
);
