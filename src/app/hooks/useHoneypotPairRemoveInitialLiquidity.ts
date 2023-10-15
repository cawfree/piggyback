import * as React from 'react';

import {getPairDetails, honeypotWithdrawLiquidity} from '../../contracts';

import {HoneypotPairCreateResult, getMaybeResult} from '../@types';
import {useHoneypotContext} from '../contexts';
import { createDeadline } from '../utils';

export function useHoneypotPairRemoveInitialLiquidity({
  honeypotPairCreateResult,
}: {
  readonly honeypotPairCreateResult: HoneypotPairCreateResult;
}) {

  const {
    provider,
    resumable: {
      honeypotContractAddress,
    },
    honeypotContractState,
    honeypotDeployer,
  } = useHoneypotContext();

  const maybeHoneypotResult = getMaybeResult(honeypotContractState);
  const maybeHoneypotPairResult = getMaybeResult(honeypotPairCreateResult);

  const removeInitialLiquidity = React.useCallback(
    async () => {
      
      if (!maybeHoneypotResult) throw new Error('Unable to remove liquidity - missing Honeypot.');
      if (!maybeHoneypotPairResult) throw new Error('Unable to remove liquidity - missing HoneypotPair.');

      const maybeRouterV2 = maybeHoneypotResult?.getRouterV2;
      const maybeFactory = maybeHoneypotResult?.getFactory; 

      if (typeof honeypotContractAddress !== 'string' || !honeypotContractAddress.length)
        throw new Error(`Expected non-empty string honeypotContractAddress, encountered "${
          String(honeypotContractAddress)
        }".`);

      if (!maybeFactory)
        throw new Error(`Expected Factory, encountered "${
          String(maybeFactory)
        }".`);

      if (!maybeRouterV2)
        throw new Error(`Expected RouterV2, encountered "${
          String(maybeRouterV2)
        }".`);

      // Compute the amount out.
      const {getHoneypotPairContract} = await getPairDetails({
        getFactory: maybeFactory,
        honeypotDeployer,
        honeypotContractAddress,
      });

      await honeypotWithdrawLiquidity({
        deadline: await createDeadline({provider}),
        honeypotContractAddress,
        honeypotPairContract: getHoneypotPairContract(honeypotDeployer),
        wallet: honeypotDeployer,
        routerV2: maybeRouterV2(honeypotDeployer),
      });
    },
    [
      maybeHoneypotResult,
      maybeHoneypotPairResult,
      honeypotContractAddress,
      honeypotDeployer,
      provider,
    ]
  );

  return {removeInitialLiquidity};
}