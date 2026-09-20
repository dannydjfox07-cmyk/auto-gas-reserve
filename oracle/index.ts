import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
} from "viem";

import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import OpenAI from "openai";

const AUTO_GAS_RESERVE =
  "0x1a28eD4CbE7Be4748FE3c822Bd4b5B1f358c25bA" as `0x${string}`;

const autoGasReserveAbi = [
  {
    type: "function",
    name: "topUpGas",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "user",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    outputs: [],
  },
] as const;

type GraphQLResponse = {
  data: {
    depositss: {
      items: {
        user: string;
        amount: string;
      }[];
    };
    gasTopupss: {
      items: {
        user: string;
        amount: string;
      }[];
    };
    withdrawalss: {
      items: {
        user: string;
        amount: string;
      }[];
    };
  };
};

const LLM_BASE_URL =
  process.env.LLM_BASE_URL!;

const LLM_API_KEY =
  process.env.LLM_API_KEY!;

const LLM_MODEL =
  process.env.LLM_MODEL!;

const llm = new OpenAI({
  baseURL: LLM_BASE_URL,
  apiKey: LLM_API_KEY,
});

const app = new Hono();
app.use(
  "*",
  cors({
    origin: "http://localhost:3001",
  })
);

const PONDER_URL = "http://localhost:42069/graphql";

const RPC_URL = process.env.RPC_URL!;

const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(RPC_URL),
});

const ORACLE_PRIVATE_KEY =
  process.env.ORACLE_PRIVATE_KEY! as `0x${string}`;

const oracleAccount =
  privateKeyToAccount(ORACLE_PRIVATE_KEY);

const walletClient = createWalletClient({
  account: oracleAccount,
  chain: bscTestnet,
  transport: http(RPC_URL),
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "oracle",
  });
});

app.get("/deposits", async (c) => {
  const response = await fetch(PONDER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        {
          depositss {
            items {
              user
              amount
              blockNumber
              transactionHash
            }
            totalCount
          }
        }
      `,
    }),
  });

  const data = await response.json();

  return c.json(data);
});

app.get("/topups", async (c) => {
  const response = await fetch(PONDER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        {
          gasTopupss {
            items {
              user
              amount
              blockNumber
              transactionHash
            }
            totalCount
          }
        }
      `,
    }),
  });

  const data = await response.json();

  return c.json(data);
});

app.get("/withdrawals", async (c) => {
  const response = await fetch(PONDER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        {
          withdrawalss {
            items {
              user
              amount
              blockNumber
              transactionHash
            }
            totalCount
          }
        }
      `,
    }),
  });

  const data = await response.json();

  return c.json(data);
});

app.get("/user/:address", async (c) => {
  const address = c.req.param("address").toLowerCase();

  const queries = await Promise.all([
    fetch(PONDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          {
            depositss {
              items {
                user
                amount
              }
            }
          }
        `,
      }),
    }).then((res) => res.json() as Promise<GraphQLResponse>),

    fetch(PONDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          {
            gasTopupss {
              items {
                user
                amount
              }
            }
          }
        `,
      }),
    }).then((res) => res.json() as Promise<GraphQLResponse>),

    fetch(PONDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          {
            withdrawalss {
              items {
                user
                amount
              }
            }
          }
        `,
      }),
    }).then((res) => res.json() as Promise<GraphQLResponse>),
  ]);

  const deposits = queries[0].data.depositss.items;
  const topups = queries[1].data.gasTopupss.items;
  const withdrawals = queries[2].data.withdrawalss.items;

  const totalDeposited = deposits
    .filter((item: any) => item.user === address)
    .reduce((sum: bigint, item: any) => sum + BigInt(item.amount), 0n);

  const totalToppedUp = topups
    .filter((item: any) => item.user === address)
    .reduce((sum: bigint, item: any) => sum + BigInt(item.amount), 0n);

  const totalWithdrawn = withdrawals
    .filter((item: any) => item.user === address)
    .reduce((sum: bigint, item: any) => sum + BigInt(item.amount), 0n);

  const balance =
    totalDeposited - totalToppedUp - totalWithdrawn;

  const minimumDeposit = 50000000000000000n; // 0.05 BNB

  return c.json({
    user: address,
    totalDeposited: totalDeposited.toString(),
    totalToppedUp: totalToppedUp.toString(),
    totalWithdrawn: totalWithdrawn.toString(),
    balance: balance.toString(),
    eligible: balance >= minimumDeposit,
  });
});

app.get("/wallet/:address", async (c) => {
  const address = c.req.param("address") as `0x${string}`;

  const balance = await publicClient.getBalance({
    address,
  });

  return c.json({
    address,
    balanceWei: balance.toString(),
    balanceBNB: formatEther(balance),
  });
});

app.post("/gas/estimate", async (c) => {
  const body = await c.req.json() as {
    from: string;
    to: string;
    value?: string;
    data?: string;
  };

  const from = body.from as `0x${string}`;
  const to = body.to as `0x${string}`;

  const gasEstimate = await publicClient.estimateGas({
    account: from,
    to,
    value: body.value ? BigInt(body.value) : undefined,
    data: body.data as `0x${string}` | undefined,
  });

  const gasPrice = await publicClient.getGasPrice();

  const estimatedGasCost = gasEstimate * gasPrice;

  const walletBalance = await publicClient.getBalance({
    address: from,
  });

  const remainingBalance = walletBalance - estimatedGasCost;

  const minimumReserve = 1000000000000000n;

  const canAfford = remainingBalance >= minimumReserve;

  return c.json({
    from,
    to,

    gasEstimate: gasEstimate.toString(),
    gasPriceWei: gasPrice.toString(),

    estimatedGasCostWei: estimatedGasCost.toString(),
    estimatedGasCostBNB: formatEther(estimatedGasCost),

    walletBalanceWei: walletBalance.toString(),
    walletBalanceBNB: formatEther(walletBalance),

    remainingBalanceWei: remainingBalance.toString(),
    remainingBalanceBNB: formatEther(remainingBalance),

    minimumReserveWei: minimumReserve.toString(),
    minimumReserveBNB: formatEther(minimumReserve),

    canAfford,
  });
});

app.get("/gas/:address", async (c) => {
  const address = c.req.param("address").toLowerCase();
  const now = Math.floor(Date.now() / 1000);

  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60;

  let pageKey: string | undefined;
  let totalGasSpent = 0n;
  let recent7DayGasSpent = 0n;
  let transactionsAnalyzed = 0;

  do {
    const transfersUrl = new URL(RPC_URL);

    const transfersResponse = await fetch(transfersUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: address,
            category: ["external"],
            withMetadata: true,
            maxCount: "0x3e8",
            ...(pageKey ? { pageKey } : {}),
          },
        ],
      }),
    });

    const transfersData = await transfersResponse.json() as {
      result?: {
        transfers: {
          hash: string;
          from: string;
          blockNum: string;
        }[];
        pageKey?: string;
      };
      error?: {
        message: string;
      };
    };

    if (transfersData.error) {
      return c.json({
        error: transfersData.error.message,
      }, 500);
    }

    const transfers = transfersData.result?.transfers ?? [];

    for (const transfer of transfers) {
      if (transfer.from.toLowerCase() !== address) {
        continue;
      }

      const receiptResponse = await fetch(RPC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [transfer.hash],
        }),
      });

      const receiptData = await receiptResponse.json() as {
        result?: {
          status: string;
          from: string;
          gasUsed: string;
          effectiveGasPrice: string;
        };
        error?: {
          message: string;
        };
      };

      if (receiptData.error || !receiptData.result) {
        console.log("Receipt lookup failed:", {
          hash: transfer.hash,
          error: receiptData.error,
        });
        continue;
      }

      const receipt = receiptData.result;

      // Only successful transactions count.
      if (receipt.status !== "0x1") {
        continue;
      }

      // Double-check the transaction sender.
      if (receipt.from.toLowerCase() !== address) {
        continue;
      }

      const blockResponse = await fetch(RPC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBlockByNumber",
          params: [transfer.blockNum, false],
        }),
      });

      const blockData = await blockResponse.json() as {
        result?: {
          timestamp: string;
        };
        error?: {
          message: string;
        };
      };

      if (blockData.error || !blockData.result) {
        console.log("Skipping transaction — block lookup failed:", transfer.hash);
        continue;
      }

      const blockTimestamp = parseInt(
        blockData.result.timestamp,
        16,
      );

      if (blockTimestamp < thirtyDaysAgo) {
        continue;
      }

      const gasUsed = BigInt(receipt.gasUsed);
      const effectiveGasPrice = BigInt(receipt.effectiveGasPrice);

      const gasCost = gasUsed * effectiveGasPrice;

      totalGasSpent += gasCost;

      if (blockTimestamp >= sevenDaysAgo) {
        recent7DayGasSpent += gasCost;
      }

      transactionsAnalyzed++;
    }

    pageKey = transfersData.result?.pageKey;
  } while (pageKey);

  const averageGasPerDay = totalGasSpent / 30n;
  const recent7DayAverageGasPerDay = recent7DayGasSpent / 7n;

  const planningGasPerDay =
    recent7DayAverageGasPerDay > averageGasPerDay
      ? recent7DayAverageGasPerDay
      : averageGasPerDay;

  const targetReserveDays = 14;

  const targetGasReserve =
    planningGasPerDay * BigInt(targetReserveDays);

  const gasUsageAcceleration =
    averageGasPerDay > 0n
      ? Number(recent7DayAverageGasPerDay) /
      Number(averageGasPerDay)
      : null;

  const gasUsageAccelerationThreshold = 2;

  const gasUsageIncreasing =
    gasUsageAcceleration !== null &&
    gasUsageAcceleration >= gasUsageAccelerationThreshold;

  const walletBalance = await publicClient.getBalance({
    address: address as `0x${string}`,
  });

  const recommendedTopUp =
    walletBalance < targetGasReserve
      ? targetGasReserve - walletBalance
      : 0n;

  const maxTopUp = 50000000000000000n; // 0.05 BNB

  const cappedRecommendedTopUp =
    recommendedTopUp > maxTopUp
      ? maxTopUp
      : recommendedTopUp;

  const estimatedRunwayDays =
    averageGasPerDay > 0n
      ? Number(walletBalance) / Number(averageGasPerDay)
      : null;

  const runwayThresholdDays = 7;

  const needsTopUp =
    estimatedRunwayDays !== null &&
    estimatedRunwayDays < runwayThresholdDays;

  return c.json({
    address,
    periodDays: 30,

    totalGasSpentWei: totalGasSpent.toString(),
    averageGasPerDayWei: averageGasPerDay.toString(),

    totalGasSpentBNB: formatEther(totalGasSpent),
    averageGasPerDayBNB: formatEther(averageGasPerDay),

    recent7DayGasSpentWei: recent7DayGasSpent.toString(),
    recent7DayAverageGasPerDayWei: recent7DayAverageGasPerDay.toString(),

    recent7DayGasSpentBNB: formatEther(recent7DayGasSpent),
    recent7DayAverageGasPerDayBNB: formatEther(
      recent7DayAverageGasPerDay,
    ),

    gasUsageAcceleration,
    gasUsageAccelerationThreshold,
    gasUsageIncreasing,

    planningGasPerDayWei: planningGasPerDay.toString(),
    planningGasPerDayBNB: formatEther(planningGasPerDay),

    targetReserveDays,

    targetGasReserveWei: targetGasReserve.toString(),
    targetGasReserveBNB: formatEther(targetGasReserve),

    walletBalanceWei: walletBalance.toString(),
    walletBalanceBNB: formatEther(walletBalance),

    recommendedTopUpWei: cappedRecommendedTopUp.toString(),
    recommendedTopUpBNB: formatEther(cappedRecommendedTopUp),

    maxTopUpWei: maxTopUp.toString(),
    maxTopUpBNB: formatEther(maxTopUp),

    estimatedRunwayDays,
    runwayThresholdDays,
    needsTopUp,

    transactionsAnalyzed,
  });
});

app.post("/recommendation", async (c) => {
  const body = await c.req.json() as {
    address: string;
    to: string;
    value?: string;
    data?: string;
    simulatedWalletBalanceWei?: string;
  };

  const address = body.address.toLowerCase();

  // --------------------------------------------------
  // 1. Reserve information from AutoGasReserve
  // --------------------------------------------------

  const reserveResponse = await fetch(
    `http://localhost:3000/user/${address}`,
  );

  if (!reserveResponse.ok) {
    return c.json(
      { error: "Failed to retrieve reserve information" },
      500,
    );
  }

  const reserveData = await reserveResponse.json() as {
    balance: string;
    eligible: boolean;
  };

  const reserveBalance = BigInt(reserveData.balance);

  // --------------------------------------------------
  // 2. Gas history
  // --------------------------------------------------

  const gasResponse = await fetch(
    `http://localhost:3000/gas/${address}`,
  );

  if (!gasResponse.ok) {
    return c.json(
      { error: "Failed to retrieve gas history" },
      500,
    );
  }

  const gasData = await gasResponse.json() as {
    estimatedRunwayDays: number | null;
    averageGasPerDayWei: string;
    gasUsageIncreasing: boolean;
    planningGasPerDayBNB: string;
    targetReserveDays: number;
    targetGasReserveWei: string;
    targetGasReserveBNB: string;
  };
  // --------------------------------------------------
  // 3. Upcoming transaction gas estimation
  // --------------------------------------------------

  const from = address as `0x${string}`;
  const to = body.to as `0x${string}`;

  const transactionValue = body.value
    ? BigInt(body.value)
    : 0n;

  const gasEstimate = await publicClient.estimateGas({
    account: from,
    to,
    value: transactionValue,
    data: body.data as `0x${string}` | undefined,
  });

  const gasPrice = await publicClient.getGasPrice();

  const estimatedGasCost =
    gasEstimate * gasPrice;

  const totalTransactionCost =
    transactionValue + estimatedGasCost;

  // --------------------------------------------------
  // 4. Wallet balance + affordability
  // --------------------------------------------------

  const actualWalletBalance =
    await publicClient.getBalance({
      address: from,
    });

  const walletBalance =
    body.simulatedWalletBalanceWei
      ? BigInt(body.simulatedWalletBalanceWei)
      : actualWalletBalance;

  const remainingBalance =
    walletBalance - totalTransactionCost;

  const remainingAfterGas =
    walletBalance - estimatedGasCost;

  const minimumReserve = 1000000000000000n; // 0.001 BNB

  const canAffordGas =
    remainingAfterGas >= minimumReserve;

  const canAffordTransaction =
    remainingBalance >= minimumReserve;

  const averageGasPerDayWei =
    BigInt(gasData.averageGasPerDayWei);

  const estimatedRunwayDays =
    averageGasPerDayWei > 0n
      ? Number(walletBalance) / Number(averageGasPerDayWei)
      : null;

  // --------------------------------------------------
  // 5. Deterministic decision engine
  // --------------------------------------------------

  const reasons: string[] = [];

  const lowRunway =
    estimatedRunwayDays !== null &&
    estimatedRunwayDays < 7;

  const gasUnaffordable =
    !canAffordGas;

  if (lowRunway) {
    reasons.push(
      "Wallet gas runway is below 7 days",
    );
  }

  if (gasUnaffordable) {
    reasons.push(
      "Wallet cannot afford the upcoming transaction gas while maintaining the safety reserve",
    );
  }

  if (gasData.gasUsageIncreasing) {
    reasons.push(
      "Recent gas usage is significantly higher than the historical baseline",
    );
  }

  // --------------------------------------------------
  // 6. Reserve decision
  // --------------------------------------------------

  const reserveAvailable =
    reserveData.eligible &&
    reserveBalance > 0n;

  // How much gas the wallet should have available
  // after this transaction while preserving the safety reserve.
  const gasSafetyRequirement =
    estimatedGasCost + minimumReserve;

  const gasSafetyTopUp =
    gasSafetyRequirement > walletBalance
      ? gasSafetyRequirement - walletBalance
      : 0n;

  // How much is needed to reach the target gas reserve.
  const targetReserveTopUp =
    BigInt(gasData.targetGasReserveWei) > walletBalance
      ? BigInt(gasData.targetGasReserveWei) - walletBalance
      : 0n;

  // Use whichever requirement is larger.
  const calculatedTopUp =
    targetReserveTopUp > gasSafetyTopUp
      ? targetReserveTopUp
      : gasSafetyTopUp;

  // Hard maximum for one top-up.
  const maxTopUp = 50000000000000000n; // 0.05 BNB

  const cappedRecommendedTopUp =
    calculatedTopUp > maxTopUp
      ? maxTopUp
      : calculatedTopUp;

  // Never recommend more than the user's reserve.
  const topUpAmount =
    cappedRecommendedTopUp > reserveBalance
      ? reserveBalance
      : cappedRecommendedTopUp;

  let decision:
    | "NO_ACTION"
    | "TOP_UP_RECOMMENDED"
    | "TOP_UP_UNAVAILABLE";

  if (!gasUnaffordable && !lowRunway) {
    decision = "NO_ACTION";
  } else if (reserveAvailable) {
    decision = "TOP_UP_RECOMMENDED";
  } else {
    decision = "TOP_UP_UNAVAILABLE";
  }

  // --------------------------------------------------
  // 7. Response
  // --------------------------------------------------

  return c.json({
    decision,
    reasons,

    wallet: {
      address,

      balanceWei:
        walletBalance.toString(),

      balanceBNB:
        formatEther(walletBalance),

      simulated:
        body.simulatedWalletBalanceWei !== undefined,

      remainingBalanceWei:
        remainingBalance.toString(),

      remainingBalanceBNB:
        formatEther(remainingBalance),

      canAffordGas,
      canAffordTransaction,

      remainingAfterGasWei:
        remainingAfterGas.toString(),

      remainingAfterGasBNB:
        formatEther(remainingAfterGas),
    },

    gas: {
      gasEstimate:
        gasEstimate.toString(),

      gasPriceWei:
        gasPrice.toString(),

      estimatedGasCostWei:
        estimatedGasCost.toString(),

      estimatedGasCostBNB:
        formatEther(estimatedGasCost),

      estimatedRunwayDays,

      planningGasPerDayBNB:
        gasData.planningGasPerDayBNB,

      gasUsageIncreasing:
        gasData.gasUsageIncreasing,

      targetReserveDays:
        gasData.targetReserveDays,

      targetGasReserveBNB:
        gasData.targetGasReserveBNB,

      recommendedTopUpBNB:
        formatEther(cappedRecommendedTopUp),
    },

    transaction: {
      to,

      valueWei:
        transactionValue.toString(),

      valueBNB:
        formatEther(transactionValue),

      totalCostWei:
        totalTransactionCost.toString(),

      totalCostBNB:
        formatEther(totalTransactionCost),
    },

    reserve: {
      balanceWei:
        reserveBalance.toString(),

      balanceBNB:
        formatEther(reserveBalance),

      eligible:
        reserveData.eligible,

      available:
        reserveAvailable,

      recommendedTopUpWei:
        topUpAmount.toString(),

      recommendedTopUpBNB:
        formatEther(topUpAmount),
    },

    safety: {
      minimumWalletReserveWei:
        minimumReserve.toString(),

      minimumWalletReserveBNB:
        formatEther(minimumReserve),
    },
  });
});

app.get("/oracle", async (c) => {
  const balance = await publicClient.getBalance({
    address: oracleAccount.address,
  });

  return c.json({
    address: oracleAccount.address,
    balanceWei: balance.toString(),
    balanceBNB: formatEther(balance),
  });
});

app.post("/topup/simulate", async (c) => {
  const body = await c.req.json() as {
    user: string;
    amountWei: string;
  };

  const user = body.user as `0x${string}`;
  const amount = BigInt(body.amountWei);

  try {
    const simulation = await publicClient.simulateContract({
      address: AUTO_GAS_RESERVE,
      abi: autoGasReserveAbi,
      functionName: "topUpGas",
      args: [user, amount],
      account: oracleAccount,
    });

    return c.json({
      success: true,
      oracle: oracleAccount.address,
      contract: AUTO_GAS_RESERVE,
      user,
      amountWei: amount.toString(),
      amountBNB: formatEther(amount),
      simulationPassed: true,
    });
  } catch (error) {
    return c.json({
      success: false,
      oracle: oracleAccount.address,
      contract: AUTO_GAS_RESERVE,
      user,
      amountWei: amount.toString(),
      amountBNB: formatEther(amount),
      simulationPassed: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    }, 400);
  }
});

app.post("/topup", async (c) => {
  const body = await c.req.json() as {
    user: string;
    amountWei: string;
    to?: string;
    value?: string;
    data?: string;
  };

  const user = body.user as `0x${string}`;
  const requestedAmount = BigInt(body.amountWei);

  if (requestedAmount <= 0n) {
    return c.json({
      success: false,
      error: "Top-up amount must be greater than zero",
    }, 400);
  }

  try {
    // --------------------------------------------------
    // 1. Ask our recommendation engine
    // --------------------------------------------------

    const recommendationResponse = await fetch(
      "http://localhost:3000/recommendation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: user,
          to: body.to ?? user,
          value: body.value ?? "0",
          data: body.data,
        }),
      },
    );

    if (!recommendationResponse.ok) {
      return c.json({
        success: false,
        error: "Failed to retrieve recommendation",
      }, 500);
    }

    const recommendation =
      await recommendationResponse.json() as {
        decision: string;
        reasons: string[];
        reserve: {
          balanceWei: string;
          eligible: boolean;
          recommendedTopUpWei: string;
        };
      };

    // --------------------------------------------------
    // 2. Require an actual top-up recommendation
    // --------------------------------------------------

    if (recommendation.decision !== "TOP_UP_RECOMMENDED") {
      return c.json({
        success: false,
        error: "Top-up is not currently recommended",
        decision: recommendation.decision,
        reasons: recommendation.reasons,
      }, 400);
    }

    // --------------------------------------------------
    // 3. Enforce the recommendation amount
    // --------------------------------------------------

    const recommendedAmount =
      BigInt(recommendation.reserve.recommendedTopUpWei);

    if (requestedAmount > recommendedAmount) {
      return c.json({
        success: false,
        error: "Requested top-up exceeds the recommended amount",
        requestedAmountWei: requestedAmount.toString(),
        recommendedAmountWei: recommendedAmount.toString(),
      }, 400);
    }

    // --------------------------------------------------
    // 4. Check reserve safety
    // --------------------------------------------------

    const reserveBalance =
      BigInt(recommendation.reserve.balanceWei);

    if (!recommendation.reserve.eligible) {
      return c.json({
        success: false,
        error: "User is not eligible for a top-up",
      }, 400);
    }

    if (requestedAmount > reserveBalance) {
      return c.json({
        success: false,
        error: "Top-up exceeds available reserve",
      }, 400);
    }

    // --------------------------------------------------
    // 5. Simulate contract call
    // --------------------------------------------------

    await publicClient.simulateContract({
      address: AUTO_GAS_RESERVE,
      abi: autoGasReserveAbi,
      functionName: "topUpGas",
      args: [user, requestedAmount],
      account: oracleAccount,
    });

    // --------------------------------------------------
    // 6. Broadcast transaction
    // --------------------------------------------------

    const txHash = await walletClient.writeContract({
      address: AUTO_GAS_RESERVE,
      abi: autoGasReserveAbi,
      functionName: "topUpGas",
      args: [user, requestedAmount],
    });

    // --------------------------------------------------
    // 7. Wait for confirmation
    // --------------------------------------------------

    const receipt =
      await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

    return c.json({
      success: true,
      user,
      amountWei: requestedAmount.toString(),
      amountBNB: formatEther(requestedAmount),
      transactionHash: txHash,
      blockNumber: receipt.blockNumber.toString(),
      status: receipt.status,
    });

  } catch (error) {
    return c.json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    }, 400);
  }
});

app.get("/ai/test", async (c) => {
  try {
    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: "user",
          content:
            "Reply with exactly: AutoGasReserve AI connection successful.",
        },
      ],
    });

    return c.json({
      success: true,
      model: LLM_MODEL,
      response: response.choices[0]?.message?.content ?? "",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
});

export default {
  port: 3000,
  fetch: app.fetch,
};