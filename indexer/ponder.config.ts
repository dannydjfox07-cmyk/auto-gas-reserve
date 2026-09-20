import { createConfig } from "ponder";
import { AutoGasReserveAbi } from "./abis/AutoGasReserveAbi";

export default createConfig({
  chains: {
    bscTestnet: {
      id: 97,
      rpc: process.env.PONDER_RPC_URL_97,
      // ethGetLogsBlockRange: 10,
    },
  },

  contracts: {
    AutoGasReserve: {
      chain: "bscTestnet",
      abi: AutoGasReserveAbi,
      address: "0x1a28eD4CbE7Be4748FE3c822Bd4b5B1f358c25bA",
      startBlock: 130525911,
    },
  },
});
