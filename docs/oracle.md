# Zehn Oracle

> Offchain intelligence and execution layer for Zehn.

The Zehn Oracle is the backend service responsible for collecting wallet data, analyzing gas usage, evaluating transaction safety, generating protection recommendations, and executing authorized gas top-ups.

The Oracle is built with:

- Bun
- Hono
- Viem
- Ponder GraphQL
- BSC Testnet RPC
- Alchemy-compatible transaction data

---

## Architecture

```text
                    ┌──────────────────┐
                    │    Frontend      │
                    └────────┬─────────┘
                             │
                             │ HTTP API
                             ▼
                    ┌──────────────────┐
                    │      Hono        │
                    │   Oracle API     │
                    └────────┬─────────┘
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │ Gas         │ │ Ponder      │ │ Blockchain  │
      │ Analytics   │ │ GraphQL     │ │ RPC         │
      └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
             │               │               │
             └───────────────┼───────────────┘
                             ▼
                    ┌──────────────────┐
                    │ Decision Engine  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Simulation       │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Oracle Wallet    │
                    └────────┬─────────┘
                             │
                             ▼
                    AutoGasReserve
