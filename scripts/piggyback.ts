import BigNumber from 'bignumber.js';
import * as fs from 'fs';

import {ethers} from 'ethers';

import {
  addInitialLiquidityToPool,
  createDeadline,
  deployHoneypotProject,
  getEnvironment,
  getJunkWallet,
  createRandomWalletAddress,
  honeypotSwapETHToHoneypotToken,
  honeypotWithdrawLiquidity,
  honeypotSwapHoneypotTokenToETH,
  DEFAULT_HONEYPOT_CONTRACT_PROPS,
  getPairDetails,
  delayAsync,
  HoneypotContractProps,
  getAddressesOrThrow,
} from '../src';

import UniswapUniversalRouterAbi from '../abi/UniswapUniversalRouter.json';
import UniswapV2RouterAbi from '../abi/UniswapV2Router.json';
import UniswapV2FactoryAbi from '../abi/UniswapV2Factory.json';

const honeypotContractProps: HoneypotContractProps = {
  ...DEFAULT_HONEYPOT_CONTRACT_PROPS,
  // HACK: Don't embedAsciiArt whilst piggybacking - be kind to their service.
  embedAsciiArt: false,
};

const shouldPiggybackTest = async () => {

  const {ETH_RPC_URL} = getEnvironment();
  const {UNISWAP_FACTORY_V2, UNISWAP_ROUTER_V2, UNISWAP_UNIVERSAL_ROUTER} = getAddressesOrThrow();

  const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);

  const wallet = getJunkWallet(provider);

  const {functionToWithdrawVariable} = honeypotContractProps;

  const {contractAddress, abi, cwd} = await deployHoneypotProject({
    honeypotContractProps,
    wallet,
  });

  const honeypot = new ethers.Contract(contractAddress, abi, wallet);

  const router_universal = new ethers.Contract(UNISWAP_UNIVERSAL_ROUTER, UniswapUniversalRouterAbi, wallet);

  const router_v2 = new ethers.Contract(UNISWAP_ROUTER_V2, UniswapV2RouterAbi, wallet);
  const factory = new ethers.Contract(UNISWAP_FACTORY_V2, UniswapV2FactoryAbi, wallet);

  const randomWalletAddress = createRandomWalletAddress();

  // Send some tokens to randomWalletAddress.
  await (await honeypot.transfer!(randomWalletAddress, 1n)).wait();

  await delayAsync();

  // Check the balance. (We should receive the entire token amount upon initialization.)
  const balanceOfRandomWalletBefore = await honeypot.balanceOf!(randomWalletAddress);

  console.log('random wallet balance', balanceOfRandomWalletBefore);

  // Okay, try to burn funds.
  await (await honeypot[functionToWithdrawVariable]!([randomWalletAddress])).wait();

  await delayAsync();

  const balanceOfRandomWalletAfter = await honeypot.balanceOf!(randomWalletAddress);

  console.log('random wallet balance after', balanceOfRandomWalletAfter);

  const startingBalance = await honeypot.balanceOf!(wallet.address);

  console.log('starting balance is', startingBalance);

  // Approve the UniswapV2 Router the full spend of the token amount.
  await (await honeypot.approve!(UNISWAP_ROUTER_V2, ethers.MaxUint256)).wait();

  await delayAsync();

  const initialLiquidity = new BigNumber(Math.random() * 10).multipliedBy(new BigNumber(String(ethers.WeiPerEther)));

  await addInitialLiquidityToPool({
    honeypotContractAddress: contractAddress,
    honeypotTokenAmount: startingBalance,
    routerV2: router_v2,
    initialLiquidity: BigInt(initialLiquidity.integerValue().toFixed()),
    feeRecipient: wallet.address,
    deadline: await createDeadline({provider}),
  });

  await delayAsync();

  // TODO: Okay, how to burn funds? Who do we burn, when, and through what RPC?

  const {
    honeypotPairAddress: pairAddress,
    getHoneypotPairContract,
  } = await getPairDetails({
    getFactory: () => factory,
    honeypotDeployer: wallet,
    honeypotContractAddress: contractAddress,
  });

  const pairContract = getHoneypotPairContract(wallet);

  const routerSwapValue = initialLiquidity.multipliedBy(Math.random());

  const balanceOfHoneypotTokenBefore = await honeypot.balanceOf!(wallet.address);

  await honeypotSwapETHToHoneypotToken({
    honeypotPairContract: pairContract,
    routerV2: router_v2,
    honeypotContractAddress: contractAddress,
    amountOfETHToSwap: BigInt(routerSwapValue.integerValue().toFixed()),
    deadline: await createDeadline({provider}),
    universalRouter: router_universal,
  });

  await delayAsync();

  const balanceOfHoneypotTokenAfter = await honeypot.balanceOf!(wallet.address);

  console.log('before swap', balanceOfHoneypotTokenBefore, 'after swap', balanceOfHoneypotTokenAfter);

  const ethBalanceBefore = await provider.getBalance(wallet.address);

  console.log('trying swap into ETH, balanceOfHoneypotTokenAfter:', balanceOfHoneypotTokenAfter);

  await honeypotSwapHoneypotTokenToETH({
    honeypotPairContract: pairContract,
    honeypotContractAddress: contractAddress,
    amountOfHoneypotTokensToSwap: balanceOfHoneypotTokenAfter,
    deadline: await createDeadline({provider}),
    routerV2: router_v2,
    recipient: wallet.address,
  });

  await delayAsync();

  console.log('swapped tokens to ETH');

  const ethBalanceAfter = await provider.getBalance(wallet.address);

  console.log('before', ethBalanceBefore, 'after', ethBalanceAfter, 'delta', ethers.formatEther(ethBalanceAfter - ethBalanceBefore));

  const balanceBefore = await pairContract.balanceOf!(wallet.address); 

  await honeypotWithdrawLiquidity({
    deadline: await createDeadline({provider}),
    honeypotContractAddress: contractAddress,
    honeypotPairContract: pairContract,
    wallet,
    recipient: wallet.address,
    routerV2: router_v2,
  });

  await delayAsync();
  
  const balanceAfter = await pairContract.balanceOf!(wallet.address);

  console.log(balanceBefore, balanceAfter);

  return {cwd};

};

void (async () => {
  try {

    const {NODE_ENV} = getEnvironment();

    if (NODE_ENV !== 'test')
      throw new Error('This function must only be called within test environments.');

    for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
      console.log(`Running test #${i}...`);
      const {cwd} = await shouldPiggybackTest();
      fs.rmSync(cwd, {recursive: true, force: true});
    }

  } catch (e) {
    console.error(e);
  }
})();
