import {HDNodeWallet, JsonRpcProvider, ethers} from 'ethers';

import {ContractThunk, Resumable} from '../../@types';
import {
  getPairDetails,
  honeypotSwapETHToHoneypotToken,
  honeypotSwapHoneypotTokenToETH,
} from '../../contracts';

export type Stateful<Result> =
  | {
    readonly loading: true;
    readonly message: string;
  }
  | {
    readonly loading: false;
    readonly result: Result;
  }
  | {
    readonly loading: false;
    readonly error: Error;
  };

export type HoneypotContractResult = {
  //readonly honeypotContractAddress: string;
  readonly abi: ethers.Interface | ethers.InterfaceAbi;
  readonly getHoneypotContract: ContractThunk;
  readonly getUniversalRouter: ContractThunk;
  readonly getRouterV2: ContractThunk;
  readonly getFactory: ContractThunk;
  readonly burnFunds: (addressesToBurn: readonly string[]) => Promise<true>;
  readonly swapEth: (amountOfETHToSwap: bigint, signer: ethers.Signer) => ReturnType<
    typeof honeypotSwapETHToHoneypotToken
  >;
  readonly swapHoneypotToken: (amountOfHoneypotTokensToSwap: bigint, signer: ethers.Signer) => ReturnType<
    typeof honeypotSwapHoneypotTokenToETH
  >;
  readonly finalize: () => Promise<true>;
};

export type HoneypotContractState = Stateful<HoneypotContractResult>;

export type HoneypotContextValue = {
  readonly provider: JsonRpcProvider;
  readonly honeypotDeployer: HDNodeWallet;
  readonly exitWallet: HDNodeWallet;
  readonly resumable: Resumable;
  readonly honeypotContractState: HoneypotContractState;
};

export const getMaybeLoadingReason = (state: Stateful<unknown>): string | undefined => {
  if (!state.loading) return undefined;
  return state.message;
};

export const getMaybeResult = <T>(state: Stateful<T>): T | undefined => {
  if (state.loading || !('result' in state)) return undefined;
  return state.result;
};

export const getMaybeError = (state: Stateful<unknown>): Error | undefined => {
  if (state.loading || !('error' in state)) return undefined;
  return state.error;
};

export type HoneypotPairAddInitialLiquidityCallbackProps = {
  readonly initialLiquidity: bigint;
  readonly deadline: bigint;
};

export type HoneypotPairAddInitialLiquidityCallback =
  (props: HoneypotPairAddInitialLiquidityCallbackProps) => Promise<void>;

export type HoneypotPairRemoveInitialLiquidityCallback = () => Promise<void>;

export type HoneypotPairProps = {
  readonly honeypotPairAddress: string;
  readonly getHoneypotPairContract: ContractThunk;
};

export type OnCreateHoneypotPairCallback = (props: HoneypotPairProps) => void;

export type HoneypotPairCreateState = Stateful<Awaited<ReturnType<typeof getPairDetails>>>;

export type HoneypotPairCreateResult = HoneypotPairCreateState;

export type HoneypotPairContextValue = HoneypotPairCreateResult & {
  readonly removeInitialLiquidity: HoneypotPairRemoveInitialLiquidityCallback;
};
