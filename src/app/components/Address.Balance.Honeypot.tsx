import * as React from 'react';
import {Color} from 'ink';

import {useHoneypotContext} from '../contexts';
import {getMaybeResult} from '../@types';

import {AddressBalanceERC20} from './Address.Balance.ERC20';

export const AddressBalanceHoneypot = React.memo(
  function AddressBalanceHoneypot(props: Omit<Parameters<typeof AddressBalanceERC20>[0], 'erc20' | 'symbol'>): JSX.Element {
    const {
      honeypotContractState,
      resumable: {honeypotContractProps, honeypotContractAddress},
    } = useHoneypotContext();

    const {tokenSymbol} = honeypotContractProps;

    const maybeResult = getMaybeResult(honeypotContractState);

    if (!maybeResult) return <React.Fragment />;

    return (
      // @ts-ignore
      <Color yellowBright>
        <AddressBalanceERC20 {...props} erc20={honeypotContractAddress} symbol={tokenSymbol} />
      </Color>
    );
  }
);
