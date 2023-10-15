import * as React from 'react';
import {HDNodeWallet, JsonRpcProvider} from 'ethers';

import {Resumable} from '../../@types';

import {AppHoneypot} from './App.Honeypot';
import {HoneypotProvider} from './Honeypot.Provider';

export const App = React.memo(
  function App({
    exitWallet,
    resumable,
    provider,
    honeypotDeployer,
  }: {
    readonly exitWallet: HDNodeWallet;
    readonly resumable: Resumable;
    readonly honeypotDeployer: HDNodeWallet;
    readonly provider: JsonRpcProvider;
  }): JSX.Element {
    return (
      <HoneypotProvider
        exitWallet={exitWallet}
        honeypotDeployer={honeypotDeployer}
        resumable={resumable}
        provider={provider}
      >
        <AppHoneypot />
      </HoneypotProvider>
    );
  }
);
