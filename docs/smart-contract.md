# Zehn Smart Contract

> `AutoGasReserve.sol`

Zehn's onchain reserve is managed by the `AutoGasReserve` smart contract.

The contract is responsible for tracking user reserves, enforcing eligibility rules, authorizing the Oracle, and transferring gas to users.

---

## Deployment

| Item | Value |
|---|---|
| Network | BSC Testnet |
| Chain ID | `97` |
| Solidity | `0.8.20` |
| Contract | `0x1a28eD4CbE7Be4748FE3c822Bd4b5B1f358c25bA` |
| Oracle | `0xf3f0F1d3a5A49425Fd5fb62ff7b2198e755dE806` |
| Minimum Deposit | `0.05 BNB` |

The deployed contract is verified on BscScan.

---

## State

The contract maintains a reserve balance for each user:

```solidity
mapping(address => uint256) public deposits;
