import 'jest';

import * as fs from 'fs';
import * as path from 'path';

import {ethers} from 'ethers';

import {
  createHoneypotContract,
  createHoneypotProject,
  HoneypotContractProps,
  getEnvironment,
  deployHoneypotProject,
  DEFAULT_HONEYPOT_CONTRACT_PROPS,
} from '../src';

const originalHonypotContractProps: HoneypotContractProps = {
  contractName: 'babywand',
  addressToWithdrawVariable: 'partnership',
  ownerVariable: 'association',
  initialSupply: '540000000000',
  tokenName: 'Baby Wand',
  tokenSymbol: 'BWAND',
  functionToWithdrawVariable: 'declaration',

  // The original contract does not permit infinite approvals.
  fixApprovalLogic: false,
  correctFilename: false,
  embedAsciiArt: false,
};

const recreateOriginalHoneypot = () => createHoneypotContract(originalHonypotContractProps);

jest.setTimeout(60 * 1000);

// NOTE: Assumes `NODE_ENV=test yarn fork` has been executed beforehand.
describe('piggyback', () => {

  it('jest', expect(true).toBeTruthy);

  it('getEnvironment', () => {
    expect(getEnvironment().NODE_ENV).toBe('test');
  })

  it('recreateOriginalHoneypot', async () => {
    expect(await recreateOriginalHoneypot()).toEqual(fs.readFileSync(path.resolve('contracts', 'Original.sol'), 'utf-8'));
  });

  it('createHoneypotProject', async () => {
    const {abi} = await createHoneypotProject(DEFAULT_HONEYPOT_CONTRACT_PROPS);
    expect(Array.isArray(abi)).toBeTruthy();
    expect(Boolean(abi.length)).toBeTruthy();
  });

  it('deployAndVerifyHoneypotProject', async () => {

    if (getEnvironment().ETH_RPC_URL !== 'http://127.0.0.1:8545') throw new Error('Expected anvil.');

    const {contractAddress, cwd} = await deployHoneypotProject({
      honeypotContractProps: originalHonypotContractProps,
      wallet: ethers.Wallet.fromPhrase('test test test test test test test test test test test junk'),
    });

    expect(ethers.isAddress(contractAddress)).toBeTruthy();
    expect(fs.existsSync(cwd)).toBeTruthy();
  });

  it('fixApprovalLogic', async () => {
    expect(
      await createHoneypotContract({
        ...DEFAULT_HONEYPOT_CONTRACT_PROPS,
        embedAsciiArt: false,
      })
    ).toMatchSnapshot();
  })

});
