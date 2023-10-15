import * as React from 'react';
import {Color, Text} from 'ink';
import {ethers} from 'ethers'

import {getAddressesOrThrow} from '../../constants';
import {getEnvironment} from '../../environment';

import {AddressBalanceNative} from './Address.Balance.Native';
import {AddressBalanceHoneypot} from './Address.Balance.Honeypot';
import {AddressBalanceERC20} from './Address.Balance.ERC20';

const DEFAULT_TIMEOUT = getEnvironment().NODE_ENV === 'test'
  ? 5_000
  : 10_000;

const {WETH_ADDRESS} = getAddressesOrThrow();

export const AddressBalances = React.memo(
  function AddressBalances({
    address,
    label,
    timeout = DEFAULT_TIMEOUT,
  }: {
    readonly address: string;
    readonly label: string;
    readonly timeout?: number;
  }): JSX.Element {
    return (
      <>
        {/* @ts-ignore */}
        <Color bold>
          {/* @ts-ignore */}
          <Text children={`${label} Balance:`} />
        </Color>
        {/* @ts-ignore */}
        <Color bold>
          {/* @ts-ignore */}
          <Text children={`${ethers.getAddress(address)}`} />
        </Color>
        <AddressBalanceNative address={address} timeout={timeout} />
        <AddressBalanceERC20
          address={address}
          symbol="WETH"
          prefix=""
          erc20={WETH_ADDRESS}
          timeout={timeout}
        />
        <AddressBalanceHoneypot address={address} timeout={timeout} />
      </>
    );
  }
);
