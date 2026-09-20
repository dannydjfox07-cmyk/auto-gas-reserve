import { ponder } from "ponder:registry";
import { deposits, gasTopups, withdrawals } from "../ponder.schema";

ponder.on("AutoGasReserve:Deposited", async ({ event, context }) => {
  await context.db.insert(deposits).values({
    user: event.args.user,
    amount: event.args.amount,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

ponder.on("AutoGasReserve:GasToppedUp", async ({ event, context }) => {
  await context.db.insert(gasTopups).values({
    user: event.args.user,
    amount: event.args.amount,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

ponder.on("AutoGasReserve:Withdrawn", async ({ event, context }) => {
  await context.db.insert(withdrawals).values({
    user: event.args.user,
    amount: event.args.amount,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});
