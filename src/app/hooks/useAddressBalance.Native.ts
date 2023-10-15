import * as React from 'react';
import {ethers} from 'ethers';

import {Stateful} from '../@types';
import {useHoneypotContext} from '../contexts';

const loading = (): Stateful<bigint> => ({
  loading: true,
  message: 'Loading...',
});

export function useAddressBalanceNative({
  address,
  timeout = 1_000,
}: {
  readonly address: string;
  readonly timeout?: number;
}): Stateful<bigint> {
  const {provider} = useHoneypotContext();
  const [state, setState] = React.useState<Stateful<bigint>>(loading);

  React.useEffect(
    () => {
      const i = setInterval(
        async () => {
          try {

            if (!ethers.isAddress(address)) throw new Error('Expected address.');

            setState({loading: false, result: await provider.getBalance(address)});

          } catch (cause) {
            setState({loading: false, error: new Error('Failed to load native balance.', {cause})})
          }

        },
        timeout,
      );

      return () => void clearTimeout(i);
    },
    [address, provider]
  );

  return state;
}