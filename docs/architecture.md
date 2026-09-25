# Zehn Architecture

> Your wallet, always ready.

Zehn is composed of four primary layers:

1. Frontend
2. Oracle Backend
3. Ponder Indexer
4. Smart Contract

The system separates user interaction, offchain analysis, blockchain indexing, and onchain fund enforcement.

---

## High-Level Architecture

```text
                         ┌──────────────────┐
                         │    User Wallet   │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    Next.js UI    │
                         │     Frontend     │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Oracle Backend  │
                         │   Bun + Hono     │
                         └───────┬───┬──────┘
                                 │   │
                    ┌────────────┘   └──────────────┐
                    ▼                               ▼
           ┌─────────────────┐             ┌─────────────────┐
           │ Gas Analytics   │             │ Ponder Indexer  │
           │ & Decision      │             │    GraphQL      │
           │ Engine          │             └────────┬────────┘
           └────────┬────────┘                      │
                    │                               │
                    └──────────────┬────────────────┘
                                   ▼
                         ┌──────────────────┐
                         │ AutoGasReserve   │
                         │ Smart Contract   │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    User Wallet   │
                         │    receives gas  │
                         └──────────────────┘
