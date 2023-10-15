import * as React from 'react';
import {ethers} from 'ethers';

import {getAddressesOrThrow} from '../../constants';

import {useHoneypotContext} from '../contexts';

export function useApprovalAddressesToIgnore({
  honeypotPairAddress,
}: {
  readonly honeypotPairAddress: string;
}): readonly string[] {
  const {
    honeypotDeployer,
    resumable: {honeypotContractAddress},
    exitWallet,
  } = useHoneypotContext();

  const {
    UNISWAP_UNIVERSAL_ROUTER,
    UNISWAP_ROUTER_V2,
    UNISWAP_FACTORY_V2,
    WETH_ADDRESS,
  } = getAddressesOrThrow();

  return React.useMemo<readonly string[]>(
    () => [
      ...new Set(
        [
          UNISWAP_UNIVERSAL_ROUTER,
          UNISWAP_ROUTER_V2,
          UNISWAP_FACTORY_V2,
          WETH_ADDRESS,
          honeypotDeployer.address /* deployer */,
          honeypotPairAddress /* pair */,
          honeypotContractAddress /* erc20 */,
          exitWallet.address /* exit */,

          // NOTE: Here, other future authorized actor addresses could be allowed to approve tokens safely.

        ]
          .flatMap((e) => typeof e === 'string' && e.length ? [e] : [])
          .map(e => ethers.getAddress(e))
      ),
    ],
    [
      honeypotPairAddress,
      honeypotDeployer,
      honeypotContractAddress,
      exitWallet,
    ],
  );
}