import * as React from 'react';
import {ethers} from 'ethers';
import {Text} from 'ink';

import {useAddressBalanceNative} from '../hooks';
import {
  getMaybeError,
  getMaybeLoadingReason,
  getMaybeResult,
} from '../@types';

export const AddressBalanceNative = React.memo(
  function AddressBalanceNative({
    address,
    ...extras
  }: Parameters<typeof useAddressBalanceNative>[0]): JSX.Element {
    const state = useAddressBalanceNative({address, ...extras});

    const maybeError = getMaybeError(state);
    const maybeLoadingReason = getMaybeLoadingReason(state);
    const maybeResult = getMaybeResult(state);

    if (maybeError)
      // @ts-ignore
      return <Text children="Error" />;

    if (maybeLoadingReason)
      // @ts-ignore
      return <Text children="..." />;

    if (maybeResult === undefined) throw new Error('Expected balance.');

    // @ts-ignore
    return <Text children={`${ethers.formatEther(maybeResult)} ${ethers.EtherSymbol}`} />;
  }
);
