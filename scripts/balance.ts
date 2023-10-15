import {ethers} from 'ethers';

import {blockOnBalance, getEnvironment} from '../src';

void (async () => {
  try {
    const {DEPLOYER_MNEMONIC, ETH_RPC_URL} = await getEnvironment();

    const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
    const wallet = await ethers.Wallet.fromPhrase(DEPLOYER_MNEMONIC);

    await blockOnBalance({provider, address: wallet.address});

    const balance = await provider.getBalance(wallet.address);

    console.log(`Balance of ${wallet.address} is`, `${ethers.formatEther(balance)}${ethers.EtherSymbol}.`);

  } catch (e) {
    console.error(e);
  }
})();
