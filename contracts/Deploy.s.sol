// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {PiggybackContract} from "../src/PiggybackContract.sol";

contract Deploy is Script {

  function run() public {

    vm.startBroadcast();

    PiggybackContract piggybackContract = new PiggybackContract();

    console.log(address(piggybackContract));

    vm.stopBroadcast();

  }

}