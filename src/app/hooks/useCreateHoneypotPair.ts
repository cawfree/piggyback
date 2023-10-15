import * as React from 'react';

import {DEFAULT_INITIAL_LIQUIDITY, createOrResumeHoneypotPair} from '../../config';
import {getPairDetails, honeypotWithdrawLiquidity} from '../../contracts';
import {logger} from '../../logger';

import {
  HoneypotPairCreateResult,
  HoneypotPairCreateState,
  getMaybeResult,
} from '../@types';
import {useHoneypotContext} from '../contexts';
import {blockOnDeployment, createDeadline, delayAsync} from '../utils';

const loading = (message: string): HoneypotPairCreateState => ({
  loading: true,
  message,
});

const success = async (params: Parameters<typeof getPairDetails>[0]): Promise<HoneypotPairCreateState> => ({
  loading: false,
  result: await getPairDetails(params),
});

const error = (cause: unknown): HoneypotPairCreateState => ({
  loading: false,
  error: new Error('Unable to createHoneypotPair', {cause}),
});

export function useCreateHoneypotPair(): HoneypotPairCreateResult {

  const [state, setState] = React.useState<HoneypotPairCreateState>(
    loading('Initializing...')
  );

  const {
    honeypotDeployer,
    honeypotContractState,
    resumable,
    provider,
  } = useHoneypotContext();

  const {honeypotContractAddress} = resumable;
  const maybeResult = getMaybeResult(honeypotContractState);

  // TODO: should be stateful
  React.useEffect(
    () => void (async () => {
      try {

        const maybeHoneypotContract = maybeResult?.getHoneypotContract;
        const maybeRouterV2 = maybeResult?.getRouterV2;
        const maybeFactory = maybeResult?.getFactory;

        if (typeof honeypotContractAddress !== 'string' || !honeypotContractAddress.length)
          throw new Error(`Expected non-empty string honeypotContractAddress, encountered "${
            String(honeypotContractAddress)
          }".`);

        if (!maybeHoneypotContract)
          throw new Error(`Expected honeypotContract, encountered "${
            String(maybeHoneypotContract)
          }".`);

        if (!maybeRouterV2)
          throw new Error(`Expected RouterV2, encountered "${
            String(maybeRouterV2)
          }".`);

        if (!maybeFactory)
          throw new Error(`Expected Factory, encountered "${
            String(maybeFactory)
          }".`);


        const {honeypotPairAddress} = resumable;

        if (typeof honeypotPairAddress === 'string') {

          logger.info(`[useCreateHoneypotPair]: Determine resumable changed. Waiting for pair to exist...`);

          await blockOnDeployment({provider, address: honeypotPairAddress});

          logger.info(`[useCreateHoneypotPair]: Detected resumable pair exists!`);

          return setState(
            await success({getFactory: maybeFactory, honeypotDeployer, honeypotContractAddress})
          );
        }

        setState(loading('Resumable did not define a HoneyPotPair. Creating in ten seconds...'));

        await delayAsync(10_000);

        logger.info(`[useCreateHoneypotPair]: Detected missing pair address in resumable. Attempting to add liquidity...`);

        await createOrResumeHoneypotPair({
          honeypotDeployer,
          resumable,
          getHoneypotContract: maybeHoneypotContract,
          getRouterV2: maybeRouterV2,
          getFactory: maybeFactory,
          initialLiquidity: DEFAULT_INITIAL_LIQUIDITY,
          deadline: await createDeadline({provider}),
        });


        return setState(
          await success({
            getFactory: maybeFactory,
            honeypotDeployer,
            honeypotContractAddress,
          })
        );
      } catch (e) {
        logger.error(e);
        return setState(error(e));
      }

    })(),
    [
      resumable,
      provider,
      maybeResult,
      honeypotDeployer,
      honeypotContractAddress,
    ],
  );

  return state;
}
