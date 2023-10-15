import * as React from 'react';
import {ethers} from 'ethers';

import ERC20 from '../../../abi/ERC20.json';

import {Stateful} from '../@types';
import {useHoneypotContext} from '../contexts';

const loading = (): Stateful<bigint> => ({
  loading: true,
  message: 'Loading...',
});

export function useAddressBalanceERC20({
  address,
  erc20,
  timeout = 10_000,
}: {
  readonly address: string;
  readonly erc20: string | undefined;
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
            if (!ethers.isAddress(erc20)) throw new Error('Expected valid erc20.');

            setState({
              loading: false,
              result: await new ethers.Contract(erc20, ERC20, provider).balanceOf!(address),
            });
          } catch (cause) {
            setState({loading: false, error: new Error('Failed to load native balance.', {cause})})
          }
        },
        timeout,
      );

      return () => void clearTimeout(i);
    },
    [address, provider, erc20]
  );

  return state;
}