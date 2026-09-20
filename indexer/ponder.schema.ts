import { onchainTable, primaryKey } from "ponder";

export const users = onchainTable("users", (t) => ({
  address: t.hex().primaryKey(),
}));

export const deposits = onchainTable(
  "deposits",
  (t) => ({
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.transactionHash],
    }),
  }),
);

export const gasTopups = onchainTable(
  "gas_topups",
  (t) => ({
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.transactionHash],
    }),
  }),
);

export const withdrawals = onchainTable(
  "withdrawals",
  (t) => ({
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.transactionHash],
    }),
  }),
);
