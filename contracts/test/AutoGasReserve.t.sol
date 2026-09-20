// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AutoGasReserve} from "../src/AutoGasReserve.sol";

contract AutoGasReserveTest is Test {
    AutoGasReserve public reserve;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public oracle = makeAddr("oracle");

    function setUp() public {
        reserve = new AutoGasReserve(oracle);
    }

    function testDeposit() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 5 ether}();

        vm.prank(alice);
        reserve.deposit{value: 6 ether}();

        assertEq(reserve.deposits(alice), 11 ether);
        assertEq(address(reserve).balance, 11 ether);
    }

    function testNotEligibleBelowMinimum() public {
        vm.deal(bob, 20 ether);

        vm.prank(bob);
        reserve.deposit{value: 0.04 ether}();

        assertEq(reserve.deposits(bob), 0.04 ether);
        assertEq(reserve.isEligible(bob), false);
    }

    function testOracleAddress() public {
        assertEq(reserve.oracle(), oracle);
    }

    function testEligibleAtMinimum() public {
        vm.deal(bob, 20 ether);

        vm.prank(bob);
        reserve.deposit{value: 0.05 ether}();

        assertEq(reserve.deposits(bob), 0.05 ether);
        assertEq(reserve.isEligible(bob), true);
    }

    function testWithdraw() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 15 ether}();

        vm.prank(alice);
        reserve.withdraw(5 ether);

        assertEq(reserve.deposits(alice), 10 ether);
        assertEq(address(reserve).balance, 10 ether);
        assertEq(alice.balance, 10 ether);
        assertEq(reserve.isEligible(alice), true);
    }

    function testWithdrawBelowMinimum() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.10 ether}();

        assertEq(reserve.isEligible(alice), true);

        vm.prank(alice);
        reserve.withdraw(0.06 ether);

        assertEq(reserve.deposits(alice), 0.04 ether);
        assertEq(reserve.isEligible(alice), false);
        assertEq(address(reserve).balance, 0.04 ether);
        assertEq(alice.balance, 19.96 ether);
    }

    function testOracleCanTopUpGas() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.10 ether}();

        vm.prank(oracle);
        reserve.topUpGas(alice, 0.01 ether);

        assertEq(reserve.deposits(alice), 0.09 ether);
        assertEq(alice.balance, 19.91 ether);
        assertEq(address(reserve).balance, 0.09 ether);
    }

    function testOracleTopUpEmitsEvent() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.10 ether}();

        vm.expectEmit(true, true, false, true);
        emit AutoGasReserve.GasToppedUp(alice, 0.01 ether);

        vm.prank(oracle);
        reserve.topUpGas(alice, 0.01 ether);
    }

    function testNonOracleCannotTopUpGas() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.10 ether}();

        vm.prank(bob);

        vm.expectRevert(AutoGasReserve.NotAuthorized.selector);
        reserve.topUpGas(alice, 0.01 ether);
    }

    function testOracleCannotTopUpMoreThanDeposit() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.05 ether}();

        vm.prank(oracle);

        vm.expectRevert(AutoGasReserve.InsufficientDeposit.selector);
        reserve.topUpGas(alice, 0.06 ether);
    }

    function testDepositEmitsEvent() public {
        vm.deal(alice, 20 ether);

        vm.expectEmit(true, false, false, true);
        emit AutoGasReserve.Deposited(alice, 0.05 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.05 ether}();
    }

    function testWithdrawEmitsEvent() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.10 ether}();

        vm.expectEmit(true, false, false, true);
        emit AutoGasReserve.Withdrawn(alice, 0.05 ether);

        vm.prank(alice);
        reserve.withdraw(0.05 ether);
    }

    function testCannotDepositZero() public {
        vm.prank(alice);

        vm.expectRevert(AutoGasReserve.InvalidAmount.selector);
        reserve.deposit{value: 0}();
    }

    function testCannotWithdrawZero() public {
        vm.prank(alice);

        vm.expectRevert(AutoGasReserve.InvalidAmount.selector);
        reserve.withdraw(0);
    }

    function testOracleCannotTopUpZero() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.05 ether}();

        vm.prank(oracle);

        vm.expectRevert(AutoGasReserve.InvalidAmount.selector);
        reserve.topUpGas(alice, 0);
    }

    function testIneligibleUserCannotTopUpGas() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.04 ether}();

        assertEq(reserve.isEligible(alice), false);

        vm.prank(oracle);

        vm.expectRevert(AutoGasReserve.NotEligible.selector);
        reserve.topUpGas(alice, 0.01 ether);
    }

    function testTopUpCanMakeUserIneligible() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.06 ether}();

        assertEq(reserve.isEligible(alice), true);

        vm.prank(oracle);
        reserve.topUpGas(alice, 0.02 ether);

        assertEq(reserve.deposits(alice), 0.04 ether);
        assertEq(alice.balance, 19.96 ether);

        assertEq(reserve.isEligible(alice), false);
    }

    function testIneligibleUserCannotTopUpAgain() public {
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        reserve.deposit{value: 0.06 ether}();

        vm.prank(oracle);
        reserve.topUpGas(alice, 0.02 ether);

        assertEq(reserve.deposits(alice), 0.04 ether);
        assertEq(reserve.isEligible(alice), false);

        vm.prank(oracle);

        vm.expectRevert(AutoGasReserve.NotEligible.selector);
        reserve.topUpGas(alice, 0.01 ether);
    }
}