import {Addresses, AddressesByChain} from '../@types';
import {getEnvironment} from '../environment';

const MAINNET_ADDRESSES: Addresses = {
  UNISWAP_UNIVERSAL_ROUTER: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
  UNISWAP_ROUTER_V2: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  UNISWAP_FACTORY_V2: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  WETH_ADDRESS: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
};

const GOERLI_ADDRESSES: Addresses = {
  ...MAINNET_ADDRESSES,
  WETH_ADDRESS: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
};

const ADDRESSES_BY_CHAIN: AddressesByChain = {
  'mainnet': MAINNET_ADDRESSES,
  'mainnet-fork': MAINNET_ADDRESSES,
  'goerli': GOERLI_ADDRESSES,
  'goerli-fork': GOERLI_ADDRESSES,
};

export const getAddressesOrThrow = (): Addresses => {
  const {CHAIN} = getEnvironment();

  const {[CHAIN]: maybeAddresses} = ADDRESSES_BY_CHAIN;

  if (!maybeAddresses) throw new Error(`Unable to find Addresses for chain "${CHAIN}".`);

  return maybeAddresses;
};