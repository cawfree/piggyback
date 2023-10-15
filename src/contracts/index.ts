import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as child_process from 'child_process';

import BigNumber from 'bignumber.js';
import {HDNodeWallet, ethers} from 'ethers';
import {splitSignature} from '@ethersproject/bytes';
import {nanoid} from 'nanoid';

import ERC20Abi from '../../abi/ERC20.json';
import UniswapV2PairAbi from '../../abi/UniswapV2Pair.json';

import {ContractThunk, HoneypotContractProps} from '../@types';
import {randomContractArt} from '../art';
import {getAddressesOrThrow} from '../constants';
import {getEnvironment} from '../environment';
import {logger} from '../logger';

export const DEFAULT_SLIPPAGE = 0.0005; // 0.05% slippage

export const safeHexValue = (value: bigint) => {
  const orig = value.toString(16);
  return ethers.zeroPadValue(`0x${orig.length % 2 !== 0 ? `0${orig}` : orig}`, 32);
};

const {WETH_ADDRESS} = getAddressesOrThrow();

export const createHoneypotContract = async ({
  contractName,
  addressToWithdrawVariable,
  ownerVariable,
  initialSupply,
  tokenName,
  tokenSymbol,
  functionToWithdrawVariable,

  /* deviations */
  fixApprovalLogic,
  correctFilename,
  embedAsciiArt,
}: HoneypotContractProps): Promise<string> => `${
  embedAsciiArt ? `${await randomContractArt()}\n` : ''
}${
  fs.readFileSync(path.resolve('contracts', 'PiggybackContract.sol'), 'utf-8')
    .replaceAll('piggyback_addressesToWithdraw', addressToWithdrawVariable)
    .replaceAll('piggyback_owner', ownerVariable)
    .replaceAll('540000000000', String(initialSupply))
    .replaceAll('PiggybackTokenName', tokenName)
    .replaceAll('PiggybackTokenSymbol', tokenSymbol)
    .replaceAll('PiggybackContract', contractName)
    .replaceAll('piggyback_RehypothecateFunds', functionToWithdrawVariable)
    .split('\n')
    .flatMap(
      (line: string): readonly string[] => {
        if (fixApprovalLogic && line === '        _transfer(sender, recipient, amount);') {
          return [
            '        uint256 allowance = _allowances[sender][_msgSender()];',
            '        if (allowance < amount) revert("ERC20: transfer amount exceeds allowance");',
            '        _transfer(sender, recipient, amount);',
          ];
        } else if (fixApprovalLogic && line === '        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));') {
          return [
            '        if (allowance != type(uint256).max)',
            '          _approve(sender, _msgSender(), allowance.sub(amount, "ERC20: transfer amount exceeds allowance"));',
          ];
        } else if (correctFilename && line === '// File: shit.sol') {
          return [
            `// File: ${contractName}.sol`,
          ];
        }
        return [line];
      },
    )
    .join('\n')
  }`;

const createDeployHoneypotScript = ({contractName}: HoneypotContractProps): string => fs.readFileSync(path.resolve('contracts', 'Deploy.s.sol'), 'utf-8')
  .replaceAll('PiggybackContract', contractName);

const getProjectDir = (): string => {
  const {NODE_ENV} = getEnvironment();

  const projectId = nanoid();

  if (NODE_ENV === 'test') return path.resolve(os.tmpdir(), projectId);

  const backup = path.resolve('.backup');

  if (!fs.existsSync(backup)) fs.mkdirSync(backup);

  return path.resolve(backup, projectId);
};

export const createHoneypotProject = async (props: HoneypotContractProps) => {

  const cwd = getProjectDir();

  fs.mkdirSync(cwd);

  const opts = {cwd} as const;

  child_process.execSync('forge init --no-commit', opts);

  const {contractName} = props;

  const contract = path.resolve(cwd, 'src', `${contractName}.sol`);

  fs.writeFileSync(contract, await createHoneypotContract(props));

  child_process.execSync('forge build', opts);

  const deploy = path.resolve(cwd, 'script', 'Deploy.s.sol');

  fs.writeFileSync(deploy, createDeployHoneypotScript(props));

  const foundry = path.resolve(cwd, 'foundry.toml');

  fs.writeFileSync(foundry, `${fs.readFileSync(foundry, 'utf-8').split('\n').filter(e => !e.startsWith('#') && e.length).join('\n')}\nsolc = "0.8.18"\n`);

  const {abi} = JSON.parse(fs.readFileSync(path.resolve(cwd, 'out', `${contractName}.sol`, `${contractName}.json`), 'utf-8'));

  if (!Array.isArray(abi)) throw new Error(`Expected Array abi, encountered ${typeof abi}.`);
  
  return {dir: cwd, abi};
}

const glob = (dir: string): readonly string[] =>
  fs.readdirSync(dir)
    .flatMap(file => fs.statSync(path.join(dir, file)).isDirectory() ? glob(path.join(dir, file)) : path.join(dir, file));

export const deployHoneypotProject = async ({
  honeypotContractProps,
  wallet,
}: {
  readonly honeypotContractProps: HoneypotContractProps;
  readonly wallet: HDNodeWallet;
}) => {

  const {dir: cwd, abi} = await createHoneypotProject(honeypotContractProps);

  const opts = {cwd} as const;

  const {privateKey} = wallet;

  const {ETH_RPC_URL, NODE_ENV, ETHERSCAN_API_KEY} = getEnvironment();

  logger.info('Deploying honeypot...');

  // Deploy.
  child_process.execSync(
    `forge script script/Deploy.s.sol --rpc-url "${
      ETH_RPC_URL
    }" --private-key "${
      privateKey
    }" --broadcast`,
    opts
  );

  const broadcast = path.resolve(cwd, 'broadcast');

  const run_latest = glob(broadcast).find(e => e.endsWith('run-latest.json'));

  if (typeof run_latest !== 'string') throw new Error('Missing latest run.');

  const latest = JSON.parse(fs.readFileSync(run_latest, 'utf-8'));

  if (!latest || typeof latest !== 'object')
    throw new Error(`Expected object latest, encountered ${typeof latest}.`);

  const {transactions} = latest;

  if (!Array.isArray(transactions) || transactions.length !== 1)
    throw new Error('Expected single transaction.');

  const [transaction] = transactions;

  if (!transaction || typeof transaction !== 'object')
    throw new Error(`Expected object transaction, encountered ${typeof transaction}.`);

  const {contractAddress} = transaction;

  if (typeof contractAddress !== 'string' || !contractAddress.length)
    throw new Error(`Expected string contractAddress, encountered "${contractAddress}".`);

  logger.info(`Deployed honeypot to ${contractAddress}.`);

  const maybeContractAddress = ethers.getAddress(contractAddress);

  if (maybeContractAddress === ethers.ZeroAddress)
    throw new Error(`Expected contactAddress, encountered "${maybeContractAddress}".`);

  return {
    contractAddress: maybeContractAddress,
    cwd,
    abi,
  };
  
};

export async function getPermitSignature(
  wallet: HDNodeWallet,
  token: ethers.Contract,
  spender: string,
  value: bigint = ethers.MaxUint256,
  deadline: bigint = ethers.MaxUint256,
  permitConfig?: { nonce?: bigint; name?: string; chainId?: number; version?: string }
) {

  const [nonce, name, version, chainId] = await Promise.all([
    permitConfig?.nonce ?? token.nonces!(wallet.address),
    permitConfig?.name ?? token.name!(),
    permitConfig?.version ?? '1',
    permitConfig?.chainId ?? (await wallet.provider!.getNetwork()).chainId,
  ]);

  const verifyingContract = ethers.getAddress(await token.getAddress());

  if (verifyingContract === ethers.ZeroAddress)
    throw new Error(`Expected address, encountered "${verifyingContract}".`);

  return splitSignature(
    await wallet.signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract,
      },
      {
        Permit: [
          {
            name: 'owner',
            type: 'address',
          },
          {
            name: 'spender',
            type: 'address',
          },
          {
            name: 'value',
            type: 'uint256',
          },
          {
            name: 'nonce',
            type: 'uint256',
          },
          {
            name: 'deadline',
            type: 'uint256',
          },
        ],
      },
      {
        owner: wallet.address,
        spender,
        value,
        nonce,
        deadline,
      }
    )
  )
}

export const calculateRemoveLiquidityAmounts = async ({
  slippage = DEFAULT_SLIPPAGE,
  addressPair,
  addressToken0,
  addressToken1,
  wallet,
}: {
  readonly slippage?: number;
  readonly addressPair: string;
  readonly addressToken0: string;
  readonly addressToken1: string;
  readonly wallet: HDNodeWallet;
}) => {

  const pair = new ethers.Contract(addressPair, UniswapV2PairAbi, wallet);
  const token0 = new ethers.Contract(addressToken0, ERC20Abi, wallet);
  const token1 = new ethers.Contract(addressToken1, ERC20Abi, wallet);

  const [token0Balance, token1Balance, totalSupply, lpAmount] = await Promise.all([
    token0.balanceOf!(addressPair),
    token1.balanceOf!(addressPair),
    pair.totalSupply!(),
    pair.balanceOf!(wallet.address),
  ]);

  const minAmount0 = new BigNumber(String(lpAmount)).div(String(totalSupply)).multipliedBy(String(token0Balance)).multipliedBy(1 - slippage);
  const minAmount1 = new BigNumber(String(lpAmount)).div(String(totalSupply)).multipliedBy(String(token1Balance)).multipliedBy(1 - slippage);

  return {
    minAmount0: BigInt(minAmount0.integerValue().toFixed()),
    minAmount1: BigInt(minAmount1.integerValue().toFixed()),
  };
};

export const addInitialLiquidityToPool = async ({
  honeypotContractAddress,
  routerV2,
  initialLiquidity,
  feeRecipient,
  deadline,
  honeypotTokenAmount,
}: {
  readonly honeypotTokenAmount: bigint;
  readonly honeypotContractAddress: string;
  readonly routerV2: ethers.Contract;
  readonly initialLiquidity: bigint;
  readonly feeRecipient: string;
  readonly deadline: bigint;
}) => {

  await (await routerV2.addLiquidityETH!(
    honeypotContractAddress /* token */,
    honeypotTokenAmount /* desired */,
    honeypotTokenAmount /* min */, 
    initialLiquidity,
    feeRecipient /* to */, 
    deadline /* deadline */,
    {
      value: initialLiquidity,
    },
  )).wait(); 

};

export const getReservesForHoneypotPairContract = async ({
  honeypotPairContract,
}: {
  readonly honeypotPairContract: ethers.Contract;
}) => {
  const [
    [token0Reserve, token1Reserve],
    token0,
  ] = await Promise.all([
    honeypotPairContract.getReserves!(),
    honeypotPairContract.token0!(),
  ]);

  const token0IsWETH = ethers.getAddress(token0) === ethers.getAddress(WETH_ADDRESS);

  return {
    honeypotTokenReserves: token0IsWETH ? token1Reserve : token0Reserve,
    wethReserves: token0IsWETH ? token0Reserve : token1Reserve,
  };

};

export const honeypotSwapHoneypotTokenToETH = async ({
  honeypotContractAddress,
  honeypotPairContract,
  amountOfHoneypotTokensToSwap,
  deadline,
  routerV2,
  recipient,
}: {
  readonly honeypotContractAddress: string;
  readonly honeypotPairContract: ethers.Contract;
  readonly amountOfHoneypotTokensToSwap: bigint;
  readonly routerV2: ethers.Contract;
  readonly deadline: bigint;
  readonly recipient: string;
}) => {

  const {
    honeypotTokenReserves,
    wethReserves,
  } = await getReservesForHoneypotPairContract({
    honeypotPairContract,
  });

  logger.info(`Reserve Honeypot: ${honeypotTokenReserves}, Reserve WETH: ${wethReserves}`);

  // https://docs.uniswap.org/contracts/v2/reference/smart-contracts/library#getamountout
  // uint amountIn, uint reserveIn, uint reserveOut
  const amountOutWithoutSlippage = await routerV2.getAmountOut!(
    amountOfHoneypotTokensToSwap,
    honeypotTokenReserves,
    wethReserves,
  );

  logger.info(`Estimated amount out before slippage: ${amountOutWithoutSlippage}.`);

  const amountOutMinETH = BigInt(
    (new BigNumber(String(amountOutWithoutSlippage)).multipliedBy(1 - DEFAULT_SLIPPAGE)).integerValue().toFixed()
  );

  logger.info(`amountOutMinETH (max slippage): ${amountOutMinETH}.`);

  logger.info(`[honeypotSwapHoneypotTokenToETH]: (AmountOfHoneypotTokensToSwap: ${amountOfHoneypotTokensToSwap})`);

  // https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02#swapexacttokensforeth
  // uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline
  await (await routerV2.swapExactTokensForETH!(
    amountOfHoneypotTokensToSwap,
    amountOutMinETH,
    [honeypotContractAddress, WETH_ADDRESS],
    recipient,
    deadline,
  )).wait();

  return {amountOutMinETH};

};

export const honeypotSwapETHToHoneypotToken = async ({
  honeypotPairContract,
  routerV2,
  honeypotContractAddress,
  amountOfETHToSwap,
  deadline,
  universalRouter,
}: {
  readonly honeypotPairContract: ethers.Contract;
  readonly routerV2: ethers.Contract;
  readonly honeypotContractAddress: string;
  readonly amountOfETHToSwap: bigint;
  readonly deadline: bigint;
  readonly universalRouter: ethers.Contract;
}) => {

  const {wethReserves, honeypotTokenReserves} = await getReservesForHoneypotPairContract({
    honeypotPairContract,
  });

  // https://docs.uniswap.org/contracts/v2/reference/smart-contracts/library#getamountout
  const amountOutWithoutSlippage = await routerV2.getAmountOut!(
    amountOfETHToSwap,
    wethReserves,
    honeypotTokenReserves,
  );

  logger.info(`Requested to swap ${
    amountOfETHToSwap
  }${
    ethers.EtherSymbol
  }: (WethReserves: ${
    wethReserves
  }, HoneypotTokenReserves: ${
    honeypotTokenReserves
  }, AmountOutWithoutSlippage: ${
    amountOutWithoutSlippage
  }).`);

  const amountOutMinHoneypotToken =  BigInt(
    (new BigNumber(String(amountOutWithoutSlippage)).multipliedBy(1 - DEFAULT_SLIPPAGE)).integerValue().toFixed()
  );

  logger.info(`(AmountOutAfterSlippage: ${amountOutMinHoneypotToken})`);

  const WRAP_ETH = `0x${
    // `recipient (ADDRESS_THIS)` https://github.com/Uniswap/universal-router/blob/deda9a9a4e8840fcef869c71191ca94562cbba28/contracts/libraries/Constants.sol#L23
    safeHexValue(BigInt(2)).substring(2)
  }${
    // `amountMin` https://github.com/Uniswap/universal-router/blob/deda9a9a4e8840fcef869c71191ca94562cbba28/contracts/base/Dispatcher.sol#L178C33-L178C33
    safeHexValue(amountOfETHToSwap).substring(2)
  }`;

  const V2_SWAP_EXACT_IN = `0x${
    // `address (MSG_SENDER)` https://github.com/Uniswap/universal-router/blob/deda9a9a4e8840fcef869c71191ca94562cbba28/contracts/libraries/Constants.sol#L20C31-L20C41
    safeHexValue(BigInt(1)).substring(2)
  }${
    // `amountIn` https://github.com/Uniswap/universal-router/blob/deda9a9a4e8840fcef869c71191ca94562cbba28/contracts/base/Dispatcher.sol#L178C33-L178C33
    safeHexValue(amountOfETHToSwap).substring(2) // ✅
  }${
    // `amountOutMin` uint256
    // TBC -> how to calculate? is this slippage?
    // 0x00000000000000000000000000000000000000003393b1eb3fec09d721c081d9
    safeHexValue(amountOutMinHoneypotToken).substring(2)
  }${
    // bytes `path` (where data starts in calldata (appended after `payerIsUser`))
    '0x00000000000000000000000000000000000000000000000000000000000000a0'.substring(2)
  }${
    // `payerIsUser` (false -> we sent WETH to router previously)
    '0x0000000000000000000000000000000000000000000000000000000000000000'.substring(2)
  }${
    // data length
    '0x0000000000000000000000000000000000000000000000000000000000000002'.substring(2)
  }${
    // from
    ethers.zeroPadValue(WETH_ADDRESS, 32).substring(2)
  }${
    // to
    ethers.zeroPadValue(honeypotContractAddress, 32).substring(2)
  }`;

  await (await universalRouter.execute!(
    // https://github.com/Uniswap/universal-router
    // WRAP_ETH (0b), V2_SWAP_EXACT_IN (08)
    '0x0b08',
    [
      ethers.getBytes(WRAP_ETH),
      ethers.getBytes(V2_SWAP_EXACT_IN),
    ],
    deadline,
    {value: amountOfETHToSwap},
  )).wait();

  return {
    // NOTE: Not the actual amount returned, just the minimum possible.
    amountOutMinHoneypotToken,
  };

}

export const honeypotWithdrawLiquidity = async ({
  deadline,
  honeypotContractAddress,
  honeypotPairContract,
  wallet,
  recipient = wallet.address,
  routerV2,
}: {
  readonly deadline: bigint;
  readonly honeypotContractAddress: string;
  readonly honeypotPairContract: ethers.Contract;
  readonly wallet: ethers.HDNodeWallet;
  readonly recipient?: string;
  readonly routerV2: ethers.Contract;
}) => {

  const liquidityToRemove = await honeypotPairContract.balanceOf!(wallet.address);

  logger.info(`(liquidityToRemove: ${liquidityToRemove})`);

  if (liquidityToRemove === 0n) return;

  const [
    honeypotPairContractAddress,
    routerV2ContractAddress,
  ] = await Promise.all([
    honeypotPairContract.getAddress(),
    routerV2.getAddress(),
  ]);

  if (honeypotPairContractAddress === ethers.ZeroAddress)
    throw new Error(`Expected honeypotPairContractAddress, encountered "${
      honeypotContractAddress
    }".`);

  if (routerV2ContractAddress === ethers.ZeroAddress)
    throw new Error(`Expected routerV2ContractAddress, encountered "${
      routerV2ContractAddress
    }".`);

  const {
    minAmount0: amountETHMin,
    minAmount1: amountTokenMin,
} = await calculateRemoveLiquidityAmounts({
    addressPair: honeypotPairContractAddress,
    addressToken0: WETH_ADDRESS,
    addressToken1: honeypotContractAddress,
    wallet,
  });

  const {v, r, s} = await getPermitSignature(
    wallet /* wallet */,
    honeypotPairContract /* token */,
    routerV2ContractAddress /* spender */,
    liquidityToRemove /* value */,
    // TODO: appropriate deadline
    deadline /* deadline */,
  );

  await (await routerV2.removeLiquidityETHWithPermit!(
    honeypotContractAddress,
    liquidityToRemove,
    amountTokenMin /* amountTokenIn */,
    amountETHMin /* amountETHMin */,
    recipient /* to */,
    deadline,
    false /* approveMax */,
    v,
    r,
    s,
  )).wait();

};

export const getPairDetails = async ({
  getFactory,
  honeypotDeployer,
  honeypotContractAddress,
}: {
  readonly getFactory: ContractThunk;
  readonly honeypotDeployer: HDNodeWallet;
  readonly honeypotContractAddress: string;
}) => {

  const honeypotPairAddress = ethers.getAddress(
    await getFactory(honeypotDeployer).getPair!(
      WETH_ADDRESS,
      honeypotContractAddress,
    )
  );

  if (honeypotPairAddress === ethers.ZeroAddress)
    throw new Error(`Expected valid pair address, encountered ${
      honeypotPairAddress
    }.`);

  const getHoneypotPairContract: ContractThunk = (signer: ethers.Signer) =>
    new ethers.Contract(honeypotPairAddress, UniswapV2PairAbi, signer);

  return {honeypotPairAddress, getHoneypotPairContract} as const;
};

export const isAddressNonEmptyContractCode = async ({
  provider,
  address,
}: {
  readonly provider: ethers.Provider;
  readonly address: string;
}) => {
  const code = await provider.getCode(address);

  if (typeof code !== 'string' || !code.length) return false;

  if (!code.startsWith('0x')) return false;

  return code.length > 2;
};
