// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {AutoGasReserve} from "../src/AutoGasReserve.sol";

contract DeployAutoGasReserve is Script {
    function run() external returns (AutoGasReserve) {
        address oracle = vm.envAddress("ORACLE_ADDRESS");

        vm.startBroadcast();

        AutoGasReserve reserve = new AutoGasReserve(oracle);

        vm.stopBroadcast();

        return reserve;
    }
}