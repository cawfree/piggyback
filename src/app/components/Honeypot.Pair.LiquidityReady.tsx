import * as React from 'react';
import {useThrottledCallback} from 'use-debounce';
import {Box} from 'ink';

import {getEnvironment} from '../../environment';
import {logger} from '../../logger';

import {HoneypotPairProps, getMaybeResult} from '../@types';
import {useHoneypotContext} from '../contexts';
import {useApprovalAddressesToIgnore, useTestEnvironmentOnlyApprovalGenerator } from '../hooks';

import {AddressBalances} from './Address.Balances';
import {HoneypotCommand} from './Honeypot.Command';
import {HoneypotPairLiquidityReadyWatchApprovals} from './Honeypot.Pair.LiquidityReady.WatchApprovals';

const leading = {leading: true};

export const HoneypotPairLiquidityReady = React.memo(
  function HoneypotPairLiquidityReady({
    getHoneypotPairContract,
    honeypotPairAddress,
    debounce: maybeDebounce,
  }: Required<HoneypotPairProps> & {
    readonly debounce?: number;
  }): JSX.Element {

    const {provider, honeypotContractState, honeypotDeployer} = useHoneypotContext();
    const [calledBurns, setCalledBurns] = React.useState<readonly string[]>([]);

    const debounce = typeof maybeDebounce === 'number'
      ? maybeDebounce
      : 5_000 /* production_block_nyquist */;

    const addressesToIgnore = useApprovalAddressesToIgnore({
      honeypotPairAddress,
    });

    const maybeResult = getMaybeResult(honeypotContractState);

    useTestEnvironmentOnlyApprovalGenerator();

    const shouldRespondToAddressesThatCalledApprove = React.useCallback(
      async (addressesThatcalledApprove: readonly string[]) => {

        if (!maybeResult) throw new Error(`Expected result, encountered "${String(maybeResult)}".`);

        const addressesThatCalledApproveThatAreUnauthorized = addressesThatcalledApprove
          .filter(e => !addressesToIgnore.includes(e));

        if (!addressesThatCalledApproveThatAreUnauthorized.length) return;

        const {getHoneypotContract} = maybeResult;

        const honeypotContract = getHoneypotContract(honeypotDeployer);

        // TODO: handle this in the smart contract instead
        // Find the balances of the addresses.
        const balances = await Promise.all(
          addressesThatCalledApproveThatAreUnauthorized.map(
            (addressWhichCalledApproveThatIsUnauthorized) => honeypotContract.balanceOf!(addressWhichCalledApproveThatIsUnauthorized)
          )
        );

        const addressesWhoseFundsShouldBeBurned = addressesThatCalledApproveThatAreUnauthorized.filter(
          (_, i) => balances[i] > 0n
        );

        if (!addressesWhoseFundsShouldBeBurned.length) return /* avoid_excessive_calls */;

        const {burnFunds} = maybeResult;

        try {
          await burnFunds(addressesWhoseFundsShouldBeBurned);

          // HACK: When tracking burns, note that we can call potentially multiple times.
          setCalledBurns(currentCalledBurns => [
            ...new Set([
              ...currentCalledBurns,
              ...addressesWhoseFundsShouldBeBurned,
            ]),
          ]);
        } catch (e) {
          // HACK: If this call fails due to nonce issues, we can still
          //       burn the funds of an address on the next call to approval,
          //       which enables manual recovery. (Call `refreshApprovals()`.)
          logger.error(e);
        }
      },
      [maybeResult, addressesToIgnore, provider, honeypotDeployer]
    );

    const debouncedShouldRespondToAddressesThatCalledApprove = useThrottledCallback(
      shouldRespondToAddressesThatCalledApprove,
      debounce,
      leading,
    );

    const [
      addressesThatCalledApprove,
      onChangeAddressesThatCalledApprove,
    ] = React.useState<readonly string[]>([]);

    React.useEffect(
      () => void debouncedShouldRespondToAddressesThatCalledApprove(addressesThatCalledApprove),
      [debouncedShouldRespondToAddressesThatCalledApprove, addressesThatCalledApprove],
    );

    const onRequestRefreshApprovals = React.useCallback(
      () => shouldRespondToAddressesThatCalledApprove(addressesThatCalledApprove),
      [shouldRespondToAddressesThatCalledApprove, addressesThatCalledApprove]
    );

    if (!maybeResult) throw new Error('Expected pair result.');

    return (
      <React.Fragment>

        {/* Interact */}

        {/* @ts-ignore */}
        <Box flexDirection="row">

          {/* @ts-ignore */}
          <Box flexDirection="column" marginRight={2}>
            {/* Pair Address */}
            <AddressBalances address={honeypotPairAddress} label="Honeypot Pair" />

            <Box height={1} />

            {/* Watch Approvals */}
            <HoneypotPairLiquidityReadyWatchApprovals
              addressesThatCalledApprove={addressesThatCalledApprove}
              calledBurns={calledBurns}
              onChangeAddressesThatCalledApprove={onChangeAddressesThatCalledApprove}
              addressesToIgnore={addressesToIgnore}
              getHoneypotPairContract={getHoneypotPairContract}
              honeypotPairAddress={honeypotPairAddress}
            />

          </Box>

          {/* @ts-ignore */}
          <Box flexDirection="column">
            <HoneypotCommand onRequestRefreshApprovals={onRequestRefreshApprovals} />
          </Box>

        </Box>
 
      </React.Fragment>
    );
  }
);
