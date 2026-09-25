# ZEHN

> **Your wallet, always ready.**

Zehn is an autonomous gas protection layer for crypto wallets.

Instead of forcing users to constantly monitor their native-token balance, Zehn analyzes wallet gas usage, evaluates upcoming transactions, and can replenish gas from a dedicated reserve when protection is needed.

The goal is simple:

> **Never let a lack of gas interrupt an onchain transaction.**

---

## Overview

Gas is a fundamental requirement for interacting with blockchain networks, but managing it remains a manual and fragmented experience.

Users need to:

- keep enough native tokens in their wallet,
- estimate how much gas they will need,
- monitor their spending patterns,
- and manually acquire more gas when their balance gets low.

Zehn turns this into an automated protection system.

Users deposit funds into a dedicated gas reserve. Zehn analyzes their wallet's historical gas usage and transaction requirements, determines whether additional gas is needed, and allows an authorized Oracle to replenish the wallet from the reserve.

The result is a wallet that is designed to stay **transaction-ready**.

---

## The Problem

Onchain applications often assume that users already have enough native tokens to pay for gas.

In practice, gas management creates several problems:

### 1. Users can run out of gas

A wallet may hold valuable assets but still be unable to perform a transaction because it lacks the network's native token.

### 2. Gas requirements are difficult to predict

Gas consumption varies depending on the transaction, network conditions, and the user's activity.

### 3. Monitoring is manual

Users typically need to check their wallet balance themselves and decide when to acquire more gas.

### 4. Idle reserves provide little utility

Keeping extra native tokens in a wallet solves the immediate problem, but those funds are otherwise sitting idle.

Zehn aims to turn gas management from a **manual task** into an **automated wallet protection layer**.

## The Solution

Zehn introduces a dedicated gas reserve between the user's wallet and the applications they interact with.

Instead of relying entirely on the user's wallet balance, Zehn maintains a protected reserve that can be used to replenish gas when the wallet needs it.

Zehn combines:

- **Wallet monitoring** to understand the user's current gas balance.
- **Gas analytics** to analyze historical gas spending.
- **Transaction analysis** to estimate the cost of an upcoming transaction.
- **A deterministic decision engine** to determine whether protection is needed.
- **An Oracle** to validate and execute authorized gas top-ups.
- **A smart contract** to enforce reserve accounting and Oracle authorization.
- **Ponder indexing** to provide an onchain activity history for the dashboard.

The core principle is:

> **The AI and application layer can recommend an action, but the smart contract remains the final enforcement layer.**

This separation allows Zehn to automate gas management without giving an AI model direct control over user funds.

---

## How Zehn Works

At a high level, Zehn follows this flow:

```text
┌─────────────────┐
│   User Wallet   │
└────────┬────────┘
         │
         │ Connect & analyze
         ▼
┌─────────────────┐
│  Zehn Dashboard │
└────────┬────────┘
         │
         ├───────────────┐
         │               │
         ▼               ▼
┌─────────────────┐ ┌─────────────────┐
│  Gas Analytics  │ │ Transaction     │
│                 │ │ Safety Check    │
└────────┬────────┘ └────────┬────────┘
         │                   │
         └─────────┬─────────┘
                   ▼
          ┌──────────────────┐
          │ Decision Engine  │
          └────────┬─────────┘
                   │
          Protection needed?
                   │
                   ▼
          ┌──────────────────┐
          │      Oracle      │
          │                  │
          │ Simulate +       │
          │ execute top-up   │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ AutoGasReserve   │
          │ Smart Contract   │
          └────────┬─────────┘
                   │
                   │ Gas
                   ▼
          ┌──────────────────┐
          │   User Wallet    │
          └──────────────────┘

## Core Features

### 🛡️ Wallet Gas Protection

Zehn monitors the wallet's available native-token balance and estimated gas runway to determine whether additional protection may be required.

The current prototype uses a 7-day runway threshold to identify wallets that may need attention.

### 📊 Gas Usage Analytics

Zehn analyzes historical wallet transactions to estimate gas consumption.

The Oracle currently calculates:

- 30-day total gas spending
- Average gas spending per day
- Recent 7-day gas spending
- Gas usage acceleration
- Estimated wallet runway
- Target reserve requirements

Recent activity is compared against the historical baseline to detect significant increases in gas usage.

### 🔎 Transaction Safety Analysis

Before a transaction is executed, Zehn can estimate its gas requirements and evaluate whether the wallet will retain a minimum safety balance afterward.

The analysis considers:

- Transaction value
- Estimated gas cost
- Current wallet balance
- Minimum safety reserve
- Historical gas consumption

This allows Zehn to evaluate the transaction in the context of the wallet's overall gas health.

### 🤖 Deterministic Protection Engine

Zehn's current protection decisions are deterministic rather than dependent on an AI model.

The decision engine can return:

```text
NO_ACTION
TOP_UP_RECOMMENDED
TOP_UP_UNAVAILABLE

## Architecture

Zehn is composed of four main layers:

```text
┌─────────────────────────────────────────────────────────────┐
│                         ZEHN APP                            │
│                    Next.js + React                          │
│                                                             │
│  Wallet Dashboard · Gas Health · Transaction Safety         │
│  Protection Recommendations · Activity History              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP / JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      ZEHN ORACLE                            │
│                    Bun + Hono + Viem                        │
│                                                             │
│  Gas Analytics · Transaction Analysis · Decision Engine      │
│  Simulation · Top-up Execution · Wallet Data                 │
└───────────────┬──────────────────────┬──────────────────────┘
                │                      │
                │ GraphQL              │ JSON-RPC
                ▼                      ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│        PONDER            │   │        BSC TESTNET           │
│                          │   │                              │
│ Onchain event indexing  │   │ AutoGasReserve Contract       │
│ Deposits                │   │                              │
│ Gas top-ups             │   │ User reserves                 │
│ Withdrawals             │   │ Oracle authorization          │
└──────────────────────────┘   └──────────────────────────────┘
                │
                │
                ▼
       Historical onchain data

## User Flow

The current Zehn prototype follows this flow:

### 1. Connect Wallet

The user connects an EVM wallet to the Zehn dashboard.

Zehn reads the wallet's native-token balance and retrieves its recent gas activity.

### 2. Deposit a Gas Reserve

The user deposits native tokens into the `AutoGasReserve` contract.

The deposited funds become the user's dedicated gas protection reserve.

```text
User Wallet
     │
     │ deposit()
     ▼
AutoGasReserve
     │
     └── User Reserve

## Smart Contract

Zehn's reserve is managed by the `AutoGasReserve` smart contract, written in Solidity 0.8.20 and deployed on BSC Testnet.

### Deployment

| Item | Details |
|---|---|
| Network | BSC Testnet |
| Chain ID | 97 |
| Contract | `0x1a28eD4CbE7Be4748FE3c822Bd4b5B1f358c25bA` |
| Oracle | `0xf3f0F1d3a5A49425Fd5fb62ff7b2198e755dE806` |
| Minimum Deposit | `0.05 BNB` |
| Foundry Tests | 18 passing |

### Contract Responsibilities

The contract is responsible for the final enforcement of Zehn's reserve rules.

It:

- tracks each user's gas reserve
- enforces the minimum eligibility requirement
- allows users to withdraw their reserve
- restricts gas top-ups to the authorized Oracle
- verifies that sufficient reserve is available
- verifies that the user is eligible
- transfers gas directly to the user's wallet
- emits events for deposits, withdrawals, and top-ups

### Core Functions

#### `deposit()`

Users deposit BNB into their Zehn reserve.

```text
User Wallet
    ↓
deposit()
    ↓
AutoGasReserve

## Oracle & Decision Engine

Zehn uses an Oracle service as the bridge between offchain wallet analysis and onchain reserve execution.

The Oracle is responsible for collecting wallet data, analyzing gas usage, evaluating transaction safety, and submitting authorized transactions to the `AutoGasReserve` contract.

The Oracle does **not** replace the smart contract's security rules. It acts as the execution layer, while the contract remains the final authority.

### Oracle Stack

The Oracle is built with:

- Bun
- Hono
- Viem
- Ponder GraphQL
- Alchemy-compatible transaction data
- BSC Testnet RPC

### What the Oracle Analyzes

Zehn combines several sources of information:

```text
Wallet Balance
      +
Historical Gas Usage
      +
Recent Gas Usage
      +
Transaction Value
      +
Estimated Transaction Gas
      +
Reserve Balance
      ↓
Decision Engine
      ↓
Protection Recommendation

## AI Layer

AI is designed to extend Zehn's gas protection system with more intelligent analysis, explanations, and personalized recommendations.

The important architectural principle is:

> **AI can advise, but AI does not control user funds.**

The deterministic Oracle and smart contract remain responsible for validating and executing protection actions.

### Role of AI

The AI layer can analyze structured wallet and gas data provided by Zehn's backend and turn it into useful insights for the user.

Potential AI capabilities include:

- explaining why a wallet needs a top-up
- identifying unusual changes in gas usage
- summarizing wallet spending patterns
- explaining transaction safety risks
- providing personalized gas-management recommendations
- helping users understand their wallet health

For example:

```text
Wallet Data
    ↓
Gas Analytics
    ↓
AI Analysis
    ↓
Human-readable Explanation

## Tech Stack

Zehn combines smart contracts, blockchain indexing, backend automation, wallet infrastructure, and a web application.

| Layer | Technology | Purpose |
|---|---|---|
| Smart Contract | Solidity 0.8.20 | Gas reserve management and onchain enforcement |
| Smart Contract Framework | Foundry | Development and testing |
| Blockchain | BSC Testnet | Current deployment network |
| Frontend | Next.js + React | User dashboard and transaction flow |
| Styling | Tailwind CSS | Dashboard UI |
| Wallet | RainbowKit + Wagmi + Viem | Wallet connection and blockchain interaction |
| Oracle Backend | Bun + Hono | Gas analysis, recommendations, and execution |
| Blockchain Client | Viem | Reading and writing blockchain state |
| Indexer | Ponder | Indexing contract events |
| Database | PGLite | Local indexer storage |
| Gas Analytics | Alchemy-compatible API | Historical wallet transaction and gas data |
| AI | LLM via API | Future intelligent analysis and explanations |

### Why These Components

**Solidity + Foundry**

The reserve logic is enforced directly onchain. Foundry provides the development, testing, and deployment workflow for the smart contract.

**Next.js + React**

The frontend provides the user-facing Zehn dashboard, including wallet health, gas analytics, transaction safety, recommendations, and activity history.

**Bun + Hono**

The Oracle backend handles offchain computation and provides lightweight API endpoints for the frontend.

**Viem**

Viem is used by both the frontend and Oracle for interacting with EVM-compatible blockchain infrastructure.

**Ponder**

Ponder indexes Zehn's smart contract events and provides structured historical data to the Oracle and frontend.

**Gas Analytics**

Zehn uses wallet transaction history to estimate gas consumption and determine whether a wallet may need additional protection.

**AI**

AI is an additional intelligence layer rather than a requirement for the core protection mechanism. The current deterministic system can perform the fundamental gas analysis and protection flow independently.

## Running Locally

Zehn currently consists of four main components:

```text
Smart Contract
      │
      ├── BSC Testnet
      │
      ├── Ponder Indexer
      │
      ├── Oracle Backend
      │
      └── Next.js Frontend

## Testnet Deployment

Zehn is currently deployed and functional on **BNB Smart Chain Testnet**.

The deployed contract is the same contract used by the Oracle and frontend demonstration.

### Deployment Details

| Item | Value |
|---|---|
| Network | BSC Testnet |
| Chain ID | `97` |
| Contract | `0x1a28eD4CbE7Be4748FE3c822Bd4b5B1f358c25bA` |
| Oracle | `0xf3f0F1d3a5A49425Fd5fb62ff7b2198e755dE806` |
| Minimum Deposit | `0.05 BNB` |

### Verified Contract

The deployed contract is verified on BscScan:

https://testnet.bscscan.com/address/0x1a28eD4CbE7Be4748FE3c822Bd4b5B1f358c25bA

### Demonstrated Onchain Flow

The prototype has been tested using real BSC Testnet transactions.

Example flow:

```text
User deposits BNB
      ↓
Reserve recorded by AutoGasReserve
      ↓
Oracle analyzes wallet
      ↓
Top-up recommendation generated
      ↓
Oracle simulates topUpGas()
      ↓
Oracle submits real transaction
      ↓
Smart contract validates request
      ↓
BNB transferred to user's wallet
      ↓
Ponder indexes GasToppedUp event
      ↓
Frontend displays the activity

## Demo

The Zehn prototype demonstrates a complete gas protection flow using real transactions on BSC Testnet.

### Demo Flow

The demonstration covers:

1. Connect a Web3 wallet to Zehn.
2. View wallet balance and gas health.
3. Deposit BNB into the Zehn gas reserve.
4. Analyze historical gas usage.
5. Enter a transaction for safety analysis.
6. Receive a protection recommendation.
7. Simulate the proposed gas top-up.
8. Execute the top-up through the Zehn Oracle.
9. Verify the transaction on BSC Testnet.
10. View the resulting activity through the Zehn dashboard.

### What the Demo Proves

The prototype demonstrates that Zehn is connected to real blockchain infrastructure rather than using simulated balances or transactions.

The demonstrated flow includes:

- real BSC Testnet wallets
- a deployed smart contract
- real reserve deposits
- real Oracle execution
- real BNB transfers
- real transaction receipts
- Ponder-indexed activity
- frontend transaction history

### Demo Video

A short demonstration video will be provided with the hackathon submission.

The target demo duration is approximately **2–4 minutes**, focusing on the complete user journey from wallet connection to successful gas protection.

### Live Testnet Contract

The deployed contract can be inspected on BSC Testnet:

https://testnet.bscscan.com/address/0x1a28eD4CbE7Be4748FE3c822Bd4b5B1f358c25bA

## Business Model

Zehn is designed around a simple model:

> **Users keep their gas reserve with Zehn, while Zehn can potentially generate yield from those reserves and share a portion of the resulting yield with the protocol.**

The core product remains gas protection. Yield is an additional mechanism that can make keeping a reserve with Zehn more attractive.

### How Zehn Could Generate Revenue

A future production version could deploy a portion of eligible reserve assets into carefully selected yield strategies while maintaining sufficient liquidity for gas protection and withdrawals.

The resulting yield could be divided between:

```text
User Reserve
     │
     ├── Gas Protection Liquidity
     │
     └── Yield Strategy
              │
              ↓
           Yield
          /     \
         /       \
     User      Zehn
     Share     Share

## Roadmap

Zehn's current prototype establishes the core gas protection infrastructure. The next stages focus on making the system more autonomous, intelligent, capital-efficient, and eventually multi-chain.

### Phase 1 — Core Gas Protection ✅

Completed in the current hackathon prototype:

- [x] Gas reserve smart contract
- [x] Per-user reserve accounting
- [x] Minimum reserve eligibility
- [x] User withdrawals
- [x] Oracle authorization
- [x] Gas top-up execution
- [x] Gas usage analytics
- [x] Transaction safety analysis
- [x] Deterministic protection engine
- [x] Top-up simulation
- [x] Ponder event indexing
- [x] Onchain activity history
- [x] Web dashboard
- [x] Real BSC Testnet transactions

### Phase 2 — Intelligent Protection

The next step is to make Zehn more proactive and personalized.

- [ ] Functional AI analysis and explanations
- [ ] Personalized gas forecasting
- [ ] Improved anomaly detection
- [ ] Smarter transaction intent analysis
- [ ] More detailed wallet health insights
- [ ] Proactive protection recommendations

The AI layer will remain separated from financial execution, with deterministic rules and smart contracts maintaining control over fund movement.

### Phase 3 — Autonomous Gas Management

Move from a user-triggered protection system toward continuous wallet protection.

- [ ] Event-driven wallet monitoring
- [ ] Automated gas health checks
- [ ] Proactive top-up detection
- [ ] Background Oracle execution
- [ ] Configurable user protection policies
- [ ] Improved automation and failure recovery

The goal is to make gas management something users no longer need to actively think about.

### Phase 4 — Productive Reserves

Make idle gas reserves more capital-efficient while preserving the liquidity required for protection.

- [ ] Yield strategy integration
- [ ] Liquidity management
- [ ] Risk-aware allocation
- [ ] User/protocol yield sharing
- [ ] Transparent strategy reporting

Any production yield strategy would require careful risk management and independent security review.

### Phase 5 — Multi-Chain Gas Protection

Expand Zehn beyond a single EVM network.

- [ ] Multi-chain wallet monitoring
- [ ] Cross-chain gas reserve management
- [ ] Chain-specific gas forecasting
- [ ] Automated gas allocation between networks
- [ ] Support for additional EVM chains
- [ ] Exploration of non-EVM networks

The long-term vision is for users to have a unified gas protection layer across the networks they use.

### Long-Term Vision

Zehn aims to evolve from a gas reserve into an intelligent wallet infrastructure layer:

```text
Gas Reserve
     ↓
Gas Protection
     ↓
Intelligent Monitoring
     ↓
Autonomous Management
     ↓
Multi-Chain Wallet Infrastructure

## Current Limitations

Zehn is a functional hackathon prototype, but several components would require additional development and security work before production deployment.

### Testnet Only

The current deployment runs on BSC Testnet.

The prototype uses testnet BNB and is intended for demonstration purposes rather than production financial activity.

### Centralized Oracle

The current Oracle uses a single authorized wallet to execute `topUpGas()`.

This is appropriate for the prototype, but a production system could use stronger key management such as:

- multisignature authorization
- decentralized Oracle infrastructure
- transaction limits
- automated key rotation
- additional monitoring and emergency controls

### AI Integration

The AI layer is designed but is not currently required for the core protection flow.

The current deterministic engine handles the fundamental gas analysis and protection decision.

Future versions can add AI for:

- personalized explanations
- gas forecasting
- anomaly detection
- transaction intent analysis
- adaptive recommendations

### Yield Strategy

The current prototype does not deploy reserves into a yield-generating strategy.

"Reserve Yield" is therefore shown as a future capability rather than an active source of returns.

Any production yield implementation would require careful strategy selection, liquidity management, risk controls, and security review.

### Single-Chain Deployment

The current prototype operates on BSC Testnet.

Cross-chain gas management introduces additional complexity around:

- bridging
- liquidity
- chain-specific gas markets
- cross-chain messaging
- failure handling

Multi-chain support is therefore part of the roadmap.

### Prototype Risk Controls

The current system has been tested with Foundry and real BSC Testnet transactions, but the smart contract has **not been professionally audited**.

A production deployment would require:

- independent smart contract audit
- Oracle security review
- infrastructure monitoring
- key management improvements
- comprehensive failure and recovery testing
- economic and yield-strategy risk analysis

### Limited Historical Data

Gas recommendations currently rely on available transaction history and gas estimates.

The accuracy of future predictions can therefore vary depending on the amount and quality of a wallet's historical activity.

New wallets with limited transaction history may require more conservative assumptions.

### Hackathon Scope

The current implementation intentionally prioritizes proving the core concept:

```text
Wallet Data
    ↓
Gas Analysis
    ↓
Protection Decision
    ↓
Oracle
    ↓
Smart Contract
    ↓
Gas Top-Up

## Project Structure

The repository is organized into separate components for the smart contract, blockchain indexer, Oracle backend, and frontend.

```text
auto-gas-reserve/
│
├── contracts/
│   ├── src/
│   │   └── AutoGasReserve.sol
│   ├── test/
│   │   └── AutoGasReserve.t.sol
│   ├── script/
│   └── foundry.toml
│
├── indexer/
│   ├── ponder.config.ts
│   ├── ponder.schema.ts
│   └── src/
│       └── ...
│
├── oracle/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── services/
│   │   └── lib/
│   └── package.json
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── docs/
│   └── ...
│
├── README.md
└── .gitignore


Then the **final README section**:

```md
## License

This project is licensed under the MIT License.

See the `LICENSE` file for details.