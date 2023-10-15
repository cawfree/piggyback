import * as React from 'react';
import {parseEther} from 'ethers';
import {parse} from 'expression-eval';

import {logger} from '../../logger';

import {getMaybeResult} from '../@types';
import {useHoneypotContext, useHoneypotPairContext} from '../contexts';

export function useHoneypotCommandHandler({
  onRequestRefreshApprovals,
}: {
  readonly onRequestRefreshApprovals: () => Promise<void>;
}) {

  const {honeypotContractState, honeypotDeployer} = useHoneypotContext();
  const {
    removeInitialLiquidity: maybeRemoveInitialLiquidity,
  } = useHoneypotPairContext();

  const maybeResult = getMaybeResult(honeypotContractState);

  const onHandleExpression = React.useCallback(
    async (ast: parse.Expression) => {

      if (!maybeResult) throw new Error(`Expected result, encountered "${String(maybeResult)}".`);

      if (!maybeRemoveInitialLiquidity) throw new Error('removeInitialLiquidity was not defined.');

      const root = JSON.parse(JSON.stringify(ast));

      if (root.type === 'CallExpression') {
        const {callee, arguments: args} = root;

        if (callee.type === 'Identifier') {

          if (callee.name === 'swapEth') /* i.e. swapEth("0.1") */ {
            const [maybeValue, ...extras] = args;

            if (extras.length) throw new Error('swapEth accepts a single parameter.');

            if (maybeValue?.type !== 'Literal')
              throw new Error(`Expected literal, encountered "${String(maybeValue?.type)}".`);

            const maybeLiteralValue = maybeValue?.value;

            if (typeof maybeLiteralValue !== 'string' || !maybeLiteralValue.length)
              throw new Error(`Expected non-empty string value, encountered "${String(maybeLiteralValue)}".`);

            const value = parseEther(maybeLiteralValue);

            logger.info(`Swapping ETH against pool for value ${String(value)} ("${maybeLiteralValue}").`);

            return maybeResult.swapEth(value, honeypotDeployer);
          } else if (callee.name === 'swapHoneypotToken') /* i.e. swapHoneypotToken("0.1") */ {
            // TODO: There's an expectation here we use 18 decimals for the token! Be careful if this changes!

            const [maybeValue, ...extras] = args;

            if (extras.length) throw new Error('swapHoneypotToken accepts a single parameter.');

            if (maybeValue?.type !== 'Literal')
              throw new Error(`Expected literal, encountered "${String(maybeValue?.type)}".`);

            const maybeLiteralValue = maybeValue?.value;

            if (typeof maybeLiteralValue !== 'string' || !maybeLiteralValue.length)
              throw new Error(`Expected non-empty string value, encountered "${String(maybeLiteralValue)}".`);

            const value = parseEther(maybeLiteralValue);

            logger.info(`Swapping HoneypotToken against pool for value ${String(value)} ("${maybeLiteralValue}").`);

            return maybeResult.swapHoneypotToken(value, honeypotDeployer);
          } else if (callee.name === 'rug') /* i.e rug() */ {

            logger.info('Invoked rug(). Liquidity will be removed.');

            return maybeRemoveInitialLiquidity();
          } else if (callee.name === 'finalize') /* i.e. finalize() */ {

            logger.info('Invoked finalize(). All tokens will be moved to exit wallet.');

            return maybeResult.finalize();
          } else if (callee.name === 'refreshApprovals') {

            logger.info('Invoked refreshApprovals(). If any unauthorized balances are found, these will be revoked.');

            return onRequestRefreshApprovals();
          }

          throw new Error(`Unrecognized callee name, "${callee.name}".`);
        }

        throw new Error(`Unidentified callee, "${callee.type}".`);
      }

      throw new Error(`Encountered unsupported root expression type, "${root.type}".`);
    },
    [
      maybeResult,
      honeypotDeployer,
      maybeRemoveInitialLiquidity,
      onRequestRefreshApprovals,
    ]
  );

  return {onHandleExpression};
}
