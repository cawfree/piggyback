import 'dotenv/config';

import * as fs from 'fs';
import * as path from 'path';

import dotenv from 'dotenv';
import {ethers} from 'ethers';

const {NODE_ENV} = process.env as Partial<{
  readonly NODE_ENV: string;
}>;

if (NODE_ENV !== 'test' && NODE_ENV !== 'production')
  throw new Error(`Expected valid NODE_ENV, encountered "${String(NODE_ENV)}".`);

export const getEnvironment = () => {

  const {
    ETH_RPC_URL,
    ETHERSCAN_API_KEY,
    ETH_FORK_URL: maybeEthForkUrl,
    DEPLOYER_MNEMONIC,
    EXIT_MNEMONIC,
    SIMULATE_APPROVALS: maybeSimulateApprovals,
    CHAIN,
  } = dotenv.parse(fs.readFileSync(path.resolve(`.env.${NODE_ENV}`)));

  if (typeof ETH_RPC_URL !== 'string' || !ETH_RPC_URL.length)
    throw new Error('Expected non-empty string ETH_RPC_URL.');

  if (typeof ETHERSCAN_API_KEY !== 'string' || !ETHERSCAN_API_KEY.length)
    throw new Error('Expected non-empty string ETHERSCAN_API_KEY.');

  const hasEthForkUrl = typeof maybeEthForkUrl === 'string' && maybeEthForkUrl.length;

  if (NODE_ENV === 'test' && !hasEthForkUrl)
    throw new Error('Expected non-empty string ETH_FORK_URL.'); 

  if (typeof DEPLOYER_MNEMONIC !== 'string' || !DEPLOYER_MNEMONIC.length)
    throw new Error('Expected non-empty string DEPLOYER_MNEMONIC.');

  if (typeof EXIT_MNEMONIC !== 'string' || !EXIT_MNEMONIC.length)
    throw new Error('Expected non-empty string EXIT_MNEMONIC.');

  const shouldSimulateFakeApprovals = maybeSimulateApprovals === String(true);

  if (shouldSimulateFakeApprovals && NODE_ENV !== 'test')
    throw new Error('Attempted to generate fake approvals within a live environment!');

  if (typeof CHAIN !== 'string' || !CHAIN.length)
    throw new Error(`Expected non-empty string CHAIN, encountered "${
      String(CHAIN)
    }".`);

  return {
    ETH_RPC_URL,
    ETH_FORK_URL: String(maybeEthForkUrl),
    NODE_ENV,
    ETHERSCAN_API_KEY,
    DEPLOYER_MNEMONIC,
    EXIT_MNEMONIC,
    SIMULATE_APPROVALS: NODE_ENV === 'test' && shouldSimulateFakeApprovals,
    CHAIN,
  };

};

export const getJunkWallet = (provider: ethers.JsonRpcProvider) =>
  ethers.Wallet.fromPhrase('test test test test test test test test test test test junk', provider);
