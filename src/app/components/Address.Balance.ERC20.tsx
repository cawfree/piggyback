import * as React from 'react';
import {Text} from 'ink';
import {ethers} from 'ethers';

import {
  getMaybeError,
  getMaybeLoadingReason,
  getMaybeResult,
} from '../@types';
import {useAddressBalanceERC20} from '../hooks';

export const AddressBalanceERC20 = React.memo(
  function AddressBalanceERC20({
    symbol,
    address,
    erc20,
    prefix = '$',
    ...extras
  }: Parameters<typeof useAddressBalanceERC20>[0] & {
    readonly symbol: string;
    readonly prefix?: string;
  }): JSX.Element {
    const state = useAddressBalanceERC20({address, erc20, ...extras});

    const maybeError = getMaybeError(state);
    const maybeLoadingReason = getMaybeLoadingReason(state);
    const maybeResult = getMaybeResult(state);

    // @ts-ignore
    if (maybeError) return <Text children="Error" />;

    // @ts-ignore
    if (maybeLoadingReason) return <Text children="..." />;

    if (maybeResult === undefined) throw new Error('Expected balance.');

    // TODO: assumes 18 decimal places (make explicit)
    // @ts-ignore
    return <Text children={`${ethers.formatEther(maybeResult)} ${prefix}${symbol}`} />;
  }
);
