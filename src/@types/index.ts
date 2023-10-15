import {ethers} from 'ethers';

export type HoneypotContractDeviations = {
  readonly fixApprovalLogic: boolean /* allow infinite approvals */;
  readonly correctFilename: boolean /* remove an obvious flag */;
  readonly embedAsciiArt: boolean /* renders a random art block */;
};

export type HoneypotContractProps = HoneypotContractDeviations & {
  readonly initialSupply: string;
  readonly contractName: string;
  readonly addressToWithdrawVariable: string;
  readonly ownerVariable: string;
  readonly tokenName: string;
  readonly tokenSymbol: string;
  readonly functionToWithdrawVariable: string;
};

export type ContractThunk = (signer: ethers.Signer) => ethers.Contract;

export type ResumableHoneypot = {
  readonly honeypotContractProps: HoneypotContractProps;
  readonly honeypotContractAddress: string;
  readonly abi: ethers.Interface | ethers.InterfaceAbi;
};

export type ResumableHoneypotPair = {
  readonly honeypotPairAddress: string /* existence denotes liquidity has been added */;
};

export type ResumableMeta = {
  readonly projectDir: string;
  readonly verified: boolean;
  readonly deployerAddress: string;
  readonly exitAddress: string;
};

export type Resumable =
  & ResumableHoneypot
  & Partial<ResumableHoneypotPair> // Deployed in succession, therefore existence is not assured.
  & ResumableMeta;

export type Addresses = {
  readonly UNISWAP_UNIVERSAL_ROUTER: string;
  readonly UNISWAP_ROUTER_V2: string;
  readonly UNISWAP_FACTORY_V2: string;
  readonly WETH_ADDRESS: string;
};

export type AddressesByChain = {
  readonly [key: string]: Addresses;
};
