import * as React from 'react';
import {render} from 'ink';
import {ethers} from 'ethers';

import {
  App,
  Resumable,
  blockOnBalance,
  createOrResumeHoneypot,
  delayAsync,
  getEnvironment,
  getJunkWallet,
  logger,
  verifyHoneypotProject,
} from '../src';
 
const {ETH_RPC_URL, NODE_ENV, DEPLOYER_MNEMONIC, EXIT_MNEMONIC} = getEnvironment();

const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);

const honeypotDeployer = ethers.Wallet.fromPhrase(DEPLOYER_MNEMONIC, provider);
const exitWallet = ethers.Wallet.fromPhrase(EXIT_MNEMONIC, provider);

const maybeVerifyResumable = async (
  resumable: Resumable
): Promise<Resumable> => {

  // If we're not running in a test environment, we need to ensure
  // the smart contract is verified, as this is ironically a key trust
  // metric for third parties.
  if (NODE_ENV === 'test') return resumable;

  const {verified} = resumable;

  if (verified) return resumable;

  logger.info(`Detected that the smart contract is not verified. Attempting verification...`);

  return verifyHoneypotProject({resumable});
};

void (async () => {

  try {

    if (NODE_ENV === 'test') /* funds_within_test */ {
  
      await delayAsync();
  
      await (await getJunkWallet(provider).sendTransaction({value: ethers.parseEther('10'), to: honeypotDeployer.address})).wait();
    }

    logger.info(`Waiting on deployer balance...`);

    // Wait for the deployer to receive ether before continuing.
    await blockOnBalance({provider, address: await honeypotDeployer.getAddress()});

    logger.info(`Verified deployer balance.`)

    const resumable = await maybeVerifyResumable(
      await createOrResumeHoneypot({honeypotDeployer, exitWallet, provider})
    );

    console.clear();

    render(
      <App
        exitWallet={exitWallet}
        resumable={resumable}
        honeypotDeployer={honeypotDeployer}
        provider={provider}
      />
    );

  } catch (e) {
    console.error(e);
    logger.error(e);
  }
})();
