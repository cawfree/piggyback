import * as React from 'react';
import {Color, Text} from 'ink';
import {ethers} from 'ethers';

import {logger} from '../../logger';

import {HoneypotPairProps, getMaybeResult} from '../@types';
import {useHoneypotContext} from '../contexts';

import {AddressBalanceHoneypot} from './Address.Balance.Honeypot';
import {Rainbow} from './Rainbow';

export const HoneypotPairLiquidityReadyWatchApprovals = React.memo(
  function HoneypotPairLiquidityReadyWatchApprovals({
    addressesToIgnore,
    addressesThatCalledApprove,
    calledBurns,
    onChangeAddressesThatCalledApprove,
    showBalance = false,
  }: HoneypotPairProps & {
    // Some addresses we won't want to take tokens away from.
    readonly addressesToIgnore: readonly string[];
    readonly addressesThatCalledApprove: readonly string[];
    readonly calledBurns: readonly string[];
    readonly onChangeAddressesThatCalledApprove: React.Dispatch<React.SetStateAction<readonly string[]>>;
    readonly showBalance?: boolean;
  }): JSX.Element {
    const {honeypotContractState, honeypotDeployer} = useHoneypotContext();

    const maybeResult = getMaybeResult(honeypotContractState);

    React.useEffect(
      () => {

        if (!maybeResult) throw new Error(`Expected result, encountered "${String(maybeResult)}".`);

        const {getHoneypotContract} = maybeResult;

        // TODO: This is a misnomer. This is more just like "addressesOfInterest" now.
        const captureAdditionalAddressesThatCalledApprove = (
          additionalAddressesThatCalledApprove: readonly string[]
        ) => onChangeAddressesThatCalledApprove(
          (addressesThatCalledApprove: readonly string[]): readonly string[] => {
            const nextAddressesThatCalledApprove = [
              ...new Set(
                [
                  ...addressesThatCalledApprove,
                  ...additionalAddressesThatCalledApprove,
                ]
                  .flatMap(e => (typeof e === 'string' && e.length) ? [e] : [])
                  .map(e => ethers.getAddress(e)),
              ),
            ];

            return nextAddressesThatCalledApprove;
          }
        );

        const approvalListener = (
          owner: string,
          spender: string,
          _amount: bigint
        ) => captureAdditionalAddressesThatCalledApprove(
          [owner, spender].flatMap((e) => typeof e === 'string' && e.length ? [e] : e)
        );

        const transferListener = (
          from: string,
          to: string,
          _value: bigint
        ) => captureAdditionalAddressesThatCalledApprove(
          [from, to].flatMap((e) => typeof e === 'string' && e.length ? [e] : e)
        );

        const honeypot = getHoneypotContract(honeypotDeployer);

        void honeypot.on('Approval', approvalListener).catch(logger.error);
        void honeypot.on('Transfer', transferListener).catch(logger.error);

        return () => void Promise.all([
          honeypot.off('Approval', approvalListener).catch(logger.error),
          honeypot.off('Transfer', transferListener).catch(logger.error),
        ]);
      },
      [
        maybeResult,
        honeypotDeployer,
        onChangeAddressesThatCalledApprove,
      ]
    );

    if (!addressesThatCalledApprove.length)
      return (
        // @ts-ignore
        <Color italic>
          {/* @ts-ignore */}
          <Text children="No addresses approved." />
        </Color>
      );

    return (
      <>
       {/* @ts-ignore */}
       <Color bold>
         {/* @ts-ignore */}
         <Text children="Honeypot Approvals:" />
       </Color>
       {/* Render addresses that interacted. */}
       <Rainbow
         children={addressesThatCalledApprove.map((address: string) => (
          <React.Fragment key={address}>
            <Text
              // @ts-ignore
              children={`${
                address
              } (${
                addressesToIgnore.includes(address) ? '🤖' : `${
                  calledBurns.includes(address) ? '🔥' : '💀'
                }`
              })`}
            />
            {Boolean(showBalance) && <AddressBalanceHoneypot address={address} />}
          </React.Fragment>
         ))}
       />
      </>
    );
  }
);
