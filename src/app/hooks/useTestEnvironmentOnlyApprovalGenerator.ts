import * as React from 'react';
import {ethers, parseEther} from 'ethers';

import {getEnvironment, getJunkWallet} from '../../environment';
import {logger} from '../../logger';

import {getMaybeResult} from '../@types';
import {useHoneypotContext} from '../contexts';
import {createRandomWalletAddress} from '../utils';

export function useTestEnvironmentOnlyApprovalGenerator({
  delay = 30_000,
}: {
  readonly delay?: number;
} = {}) {
  const {provider, honeypotContractState, honeypotDeployer} = useHoneypotContext();

  const maybeResult = getMaybeResult(honeypotContractState);

  // HACK: Generate fake approvals in test environments.
  React.useEffect(
    () => {
      if (!maybeResult) throw new Error(`Expected result, encountered "${String(maybeResult)}".`); 

      const i = setInterval(
        async () =>  {
          try {

            const {NODE_ENV, SIMULATE_APPROVALS} = getEnvironment();

            if (NODE_ENV !== 'test' || !SIMULATE_APPROVALS) return;

            const {getHoneypotContract} = maybeResult;

            const {
              amountOutMinHoneypotToken: balanceToGiveToSimulatedBot,
            } = await maybeResult.swapEth(parseEther('0.01'), honeypotDeployer);

            const simulatedBot = ethers.Wallet.createRandom(provider);
            const {address: simulatedBotAddress} = simulatedBot;

            const [a, b] = await Promise.all([
              getJunkWallet(provider).sendTransaction({value: parseEther('0.1'), to: simulatedBotAddress}),
              getHoneypotContract(honeypotDeployer).transfer!(simulatedBotAddress, balanceToGiveToSimulatedBot),
            ]);

            await Promise.all([a.wait(), b.wait()]);

            const [a_, b_] = await Promise.all([
              /* auth approve() */
              maybeResult.getHoneypotContract(honeypotDeployer).approve!(simulatedBotAddress, 1n),
              /* not_auth approve() */
              maybeResult.getHoneypotContract(simulatedBot).approve!(
                createRandomWalletAddress() /* A random destination the bot is attempting to spend to. */,
                balanceToGiveToSimulatedBot,
              ),
            ]);

            await Promise.all([a_.wait(), b_.wait()]);

          } catch (e) {
            logger.error(e);
          }
        },
        delay,
      );

      return () => void clearInterval(i);
    },
    [provider, maybeResult, delay, honeypotDeployer]
  );
}