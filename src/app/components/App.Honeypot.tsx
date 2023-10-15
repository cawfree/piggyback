import * as React from 'react';
import {Box, Text} from 'ink';

import {getMaybeResult} from '../@types';
import {useHoneypotContext} from '../contexts';

import {AddressBalances} from './Address.Balances';
import {AppHoneypotPair} from './App.Honeypot.Pair';
import {HoneypotIndicator} from './Honeypot.Indicator';
import {HoneypotPairProvider} from './Honeypot.Pair.Provider';

export const AppHoneypot = React.memo(
  function AppHoneypot(): JSX.Element {
    const {
      honeypotContractState,
      honeypotDeployer: {
        address: honeypotDeployerAddress,
      },
      exitWallet: {
        address: exitWalletAddress,
      },
    } = useHoneypotContext();

    const maybeHoneypot = getMaybeResult(honeypotContractState);

    // @ts-ignore
    if (!maybeHoneypot) return <Text children="Awaiting Honeypot..." />;

    // If the Honeypot has been deployed, we can proceed to configure
    // the pair for initial liquidity deployment.
    return (
      <HoneypotPairProvider>
        {/* @ts-ignore */}
        <Box flexDirection="row"> 

          {/* @ts-ignore */}
          <Box flexDirection="column" marginRight={2}>

            {/* Honeypot Info */}
            <HoneypotIndicator />

            <Box height={1} />

            {/* Deployer Balances */}
            <AddressBalances address={honeypotDeployerAddress} label="Honeypot Deployer" />

            <Box height={1} />

            {/* Exit Balances */}
            <AddressBalances address={exitWalletAddress} label="Exit Wallet" />
          </Box>
          {/* @ts-ignore */}
          <Box flexDirection="column">
            {/* Pair Configuration */}
            <AppHoneypotPair />
          </Box>
        </Box>
      </HoneypotPairProvider>
    );
  }
);
