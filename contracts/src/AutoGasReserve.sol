// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AutoGasReserve {
    mapping(address => uint256) public deposits;

    uint256 public minimumDeposit = 0.05 ether;

    address public oracle;

    error NotAuthorized();
    error InsufficientDeposit();
    error TransferFailed();
    error InvalidAmount();
    error NotEligible();

    event GasToppedUp(address indexed user, uint256 amount);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address _oracle) {
        oracle = _oracle;
    }

    function deposit() public payable {
        if (msg.value == 0) {
            revert InvalidAmount();
        }
        deposits[msg.sender] += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    function isEligible(address user) public view returns (bool) {
        return deposits[user] >= minimumDeposit;
    }

    function withdraw(uint256 amount) external {
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (deposits[msg.sender] < amount) {
            revert InsufficientDeposit();
        }

        deposits[msg.sender] -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");

        if (!success) {
            revert TransferFailed();
        }

        emit Withdrawn(msg.sender, amount);
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) {
            revert NotAuthorized();
        }
        _;
    }

    function topUpGas(address user, uint256 amount) external onlyOracle {
        if (amount == 0) {
            revert InvalidAmount();
        }

        if (deposits[user] < amount) {
            revert InsufficientDeposit();
        }

        if (!isEligible(user)) {
            revert NotEligible();
        }

        deposits[user] -= amount;

        (bool success, ) = payable(user).call{value: amount}("");

        if (!success) {
            revert TransferFailed();
        }

        emit GasToppedUp(user, amount);
    }
}
