# piggyback
🦄 🤖 A replica implementation of an MEV honeypot bot I caught out in the wild.

## 🔧 Configuration

First, prepare your `.env.test` file:

```shell
# A way of identifying the chain being targeted.
# This is useful for the state recovery mechanism, if an attack
# is terminated unsuccessfully.
CHAIN="mainnet-fork"

# The RPC we use to consult for blockchain state. In the test environment,
# this will be the address of your local `anvil` RPC, spun up with a call
# to `yarn fork`:
ETH_RPC_URL="http://127.0.0.1:8545"

# The Ethereum RPC for calls to `yarn fork` to fork from,
# i.e. Alchemy or Infura.
ETH_FORK_URL=""

# The mnemonic of the account which will be used to initialize the attack.
# In a long-term attack, this would be the `EXIT_MNEMONIC` of the attack
# which had just finished.
DEPLOYER_MNEMONIC="" 

# The mnemonic of the account which will have funds transferred
# to, once the attack is finished.
# The idea here is we'd be able to spin up a simple high-level script
# which manages mnemonic generation and the transition between new
# attack pools.
EXIT_MNEMONIC=""

# Whether to generate fake interest in the token during tests.
# Useful for testing token rehypothecation. To appreciate how
# the attack works, you'll want this set to `true`.
SIMULATE_APPROVALS="true" 

# An Etherscan key, used to programmatically verify.
ETHERSCAN_API_KEY=""
```

## ✏️ Usage

Okay, in one window, run the following:

```shell
yarn fork
```

This spins up a local `anvil` fork of Ethereum Mainnet. In a separate window, run:

```shell
NODE_ENV=test yarn start
```

To load up the GUI and initialize the attack. You'll be asked to provide some high-level configuration properties like the token `name`, `totalSupply()` etc.

The attack CLI is command based, where you need to supply high-level commands to define specific operations. You type these using the green cursor once the attack has successfully initialized.

> [!TIP]
>
> Piggyback will save your attack state to ensure that, if for whatever reason an attack is exited prematurely, it can be resumed.
>
> This can cause some trouble with `anvil` forks, so when testing you might need to remove the auto-generated backup files which are populated in the file root.

```
# To swap ETH for Honeypot Tokens in the Pool,
# enter the following into the command line:
swapEth("0.1")\n

# To swap Honeypot tokens back, use:
swapHoneypotToken("0.1")\n

# To rug the initial liquidity from the pool, use:
rug()\n

# To manually steal Honeypot tokens back from any
# trading bots that were lured in, use (this is to
# avoid any bot from attempting to trade using the
# Honeypot token, to ensure the pool looks like
# buyers are truly trying to hold, whereas in reality
# they become programmatically insolvent.
refreshApprovals()\n

# To shut down the attack and migrate all remaining funds
# to the exit wallet, call:
finalize()\n
```

You can also run the following to sanity test the project:

```shell
yarn test
yarn piggyback
```

## ✌️ License

[**CC0-1.0**](./LICENSE)

