import {ethers} from 'ethers';

import {isAddressNonEmptyContractCode} from '../../contracts';

export const delayAsync = (timeout: number = 1000) => new Promise(resolve => setTimeout(resolve, timeout));

export const blockOnBalance = async ({
  provider,
  address,
  minBalance = 1n,
  timeout,
}: {
  readonly provider: ethers.Provider;
  readonly address: string;
  readonly minBalance?: bigint;
  readonly timeout?: number;
}) => {

  if (!ethers.isAddress(address))
    throw new Error(`Expected address, encountered "${address}".`);

  while (true) {

    const balance = await provider.getBalance(address);

    if (balance >= minBalance) break;

    await delayAsync(timeout);
  }
}

export const blockOnDeployment = async ({
  provider,
  address,
  timeout,
}: {
  readonly provider: ethers.Provider;
  readonly address: string;
  readonly timeout?: number;
}) => {

  if (!ethers.isAddress(address))
    throw new Error(`Expected address, encountered "${address}".`);

  while (true) {

    if (await isAddressNonEmptyContractCode({provider, address})) break;

    await delayAsync(timeout);
    
  }
}

export const createDeadline = async ({
  provider,
  secondsFromCurrentTimestamp = 60 * 10,
}: {
  readonly provider: ethers.JsonRpcProvider;
  readonly secondsFromCurrentTimestamp?: number;
}) => {

  const block = await provider.getBlock(await provider.getBlockNumber());

  if (!block) throw new Error('Failed to getBlock.');

 return BigInt(block.timestamp + secondsFromCurrentTimestamp);
};

export const createRandomWalletAddress = () => ethers.Wallet.createRandom().address;

export const calculateTransactionFee = ({
  maxFeePerGas,
  gasLimit,
}: {
  readonly maxFeePerGas: bigint;
  readonly gasLimit: bigint;
}): bigint => {

  if (!maxFeePerGas) throw new Error('Missing maxFeePerGas.');

  return (maxFeePerGas * (gasLimit)) /* wei */;
};
