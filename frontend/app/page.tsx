"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { formatEther, isAddress, parseEther } from "viem";
import { useAccount } from "wagmi";

export default function Home() {
  const { address } = useAccount();

  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [reserveBalance, setReserveBalance] = useState<string | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);

  type Activity = {
    type: "deposit" | "topup" | "withdrawal";
    label: string;
    amountWei: string;
    amountBNB: string;
    blockNumber: string;
    transactionHash: string;
    timestamp: string;
  };

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [averageGasPerDay, setAverageGasPerDay] = useState<string | null>(null);
  const [gasUsageIncreasing, setGasUsageIncreasing] = useState<boolean | null>(
    null
  );
  const [estimatedRunwayDays, setEstimatedRunwayDays] = useState<number | null>(
    null
  );
  const [targetReserveDays, setTargetReserveDays] = useState<number | null>(
    null
  );

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const [recommendation, setRecommendation] = useState<any>(null);
  const [checkingTransaction, setCheckingTransaction] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null
  );

  const [simulation, setSimulation] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const [executing, setExecuting] = useState(false);
  const [execution, setExecution] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setWalletBalance(null);
      setReserveBalance(null);
      setEligible(null);
      setAverageGasPerDay(null);
      setActivities([]);
      setGasUsageIncreasing(null);
      setEstimatedRunwayDays(null);
      setTargetReserveDays(null);
      return;
    }

    fetch(`http://localhost:3000/wallet/${address}`)
      .then((res) => res.json())
      .then((data) => {
        setWalletBalance(data.balanceWei);
      })
      .catch((error) => {
        console.error("Failed to fetch wallet balance:", error);
      });

    fetch(`http://localhost:3000/user/${address}`)
      .then((res) => res.json())
      .then((data) => {
        setReserveBalance(data.balance);
        setEligible(data.eligible);
      })
      .catch((error) => {
        console.error("Failed to fetch reserve data:", error);
      });

    fetch(`http://localhost:3000/gas/${address}`)
      .then((res) => res.json())
      .then((data) => {
        setAverageGasPerDay(data.averageGasPerDayWei);
        setGasUsageIncreasing(data.gasUsageIncreasing);
        setEstimatedRunwayDays(data.estimatedRunwayDays);
        setTargetReserveDays(data.targetReserveDays);
      })
      .catch((error) => {
        console.error("Failed to fetch gas analytics:", error);
      });

    setActivityLoading(true);

    fetch(`http://localhost:3000/activity/${address}`)
      .then((res) => res.json())
      .then((data) => {
        setActivities(data.activities ?? []);
      })
      .catch((error) => {
        console.error("Failed to fetch activity:", error);
        setActivities([]);
      })
      .finally(() => {
        setActivityLoading(false);
      });

  }, [address]);



  const checkTransaction = async () => {
    if (!address) {
      setRecommendationError("Please connect your wallet first.");
      return;
    }

    if (!isAddress(recipient)) {
      setRecommendationError("Please enter a valid recipient address.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setRecommendationError("Please enter a valid transaction amount.");
      return;
    }

    try {
      setCheckingTransaction(true);
      setRecommendationError(null);
      setRecommendation(null);
      setSimulation(null);
      setSimulationError(null);
      setExecution(null);
      setExecutionError(null);

      const valueWei = parseEther(amount).toString();

      const response = await fetch(
        "http://localhost:3000/recommendation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address,
            to: recipient,
            value: valueWei,
          }),
        }
      );

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText || `Oracle returned HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to get recommendation.");
      }

      setRecommendation(data);
    } catch (error) {
      console.error("Recommendation failed:", error);

      setRecommendationError(
        error instanceof Error
          ? error.message
          : "Failed to check transaction."
      );
    } finally {
      setCheckingTransaction(false);
    }
  };

  const simulateTopUp = async () => {
    if (!address || !recommendation) {
      return;
    }

    if (recommendation.decision !== "TOP_UP_RECOMMENDED") {
      return;
    }

    try {
      setSimulating(true);
      setSimulationError(null);
      setSimulation(null);

      const response = await fetch(
        "http://localhost:3000/topup/simulate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: address,
            amountWei: recommendation.reserve.recommendedTopUpWei,
          }),
        }
      );

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText || `Oracle returned HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Simulation failed.");
      }

      setSimulation(data);
    } catch (error) {
      console.error("Top-up simulation failed:", error);

      setSimulationError(
        error instanceof Error
          ? error.message
          : "Top-up simulation failed."
      );
    } finally {
      setSimulating(false);
    }
  };

  const executeTopUp = async () => {
    if (!address || !recommendation) {
      return;
    }

    if (recommendation.decision !== "TOP_UP_RECOMMENDED") {
      return;
    }

    try {
      setExecuting(true);
      setExecutionError(null);
      setExecution(null);

      const response = await fetch(
        "http://localhost:3000/topup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: address,
            amountWei: recommendation.reserve.recommendedTopUpWei,
            to: recipient,
            value: parseEther(amount).toString(),
          }),
        }
      );

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText || `Oracle returned HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Top-up execution failed.");
      }

      setExecution(data);

      const [walletResponse, reserveResponse, activityResponse] =
        await Promise.all([
          fetch(`http://localhost:3000/wallet/${address}`),
          fetch(`http://localhost:3000/user/${address}`),
          fetch(`http://localhost:3000/activity/${address}`),
        ]);

      const walletData = await walletResponse.json();
      const reserveData = await reserveResponse.json();
      const activityData = await activityResponse.json();

      setWalletBalance(walletData.balanceWei);
      setReserveBalance(reserveData.balance);
      setEligible(reserveData.eligible);
      setActivities(activityData.activities ?? []);
    } catch (error) {
      console.error("Top-up execution failed:", error);

      setExecutionError(
        error instanceof Error
          ? error.message
          : "Top-up execution failed."
      );
    } finally {
      setExecuting(false);
    }
  };

  const formatBNB = (value: string | null, decimals = 6) => {
    if (!value) return null;

    try {
      return Number(formatEther(BigInt(value))).toFixed(decimals);
    } catch {
      return null;
    }
  };

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const walletBNB = formatBNB(walletBalance);
  const reserveBNB = formatBNB(reserveBalance);
  const averageGasBNB = formatBNB(averageGasPerDay, 8);

  const healthStatus =
    !address
      ? "Connect wallet"
      : eligible === null || estimatedRunwayDays === null
        ? "Loading..."
        : eligible && estimatedRunwayDays >= 7
          ? "Healthy"
          : estimatedRunwayDays < 7
            ? "Needs attention"
            : "Not protected";

  const healthDescription =
    healthStatus === "Healthy"
      ? "Your wallet is protected and has sufficient gas coverage."
      : healthStatus === "Needs attention"
        ? "Your wallet may need additional gas protection soon."
        : healthStatus === "Not protected"
          ? "Your wallet does not currently meet the protection requirements."
          : "Connect your wallet to view your gas health.";

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="flex min-h-screen">

        {/* ───────────────── SIDEBAR ───────────────── */}

        <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-[#090d13] px-5 py-7 lg:flex lg:flex-col">

          <div>
            <div className="px-3">
              <div className="text-xl font-semibold tracking-[0.35em]">
                ZEHN
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Your wallet, always ready.
              </p>
            </div>

            <nav className="mt-10 space-y-2">

              <button className="flex w-full items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-left text-sm font-medium text-white">
                <span className="text-emerald-400">◈</span>
                Dashboard
              </button>

              <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
                <span>↗</span>
                Transactions
              </button>

              <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
                <span>◇</span>
                Protection
              </button>

              <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
                <span>▥</span>
                Analytics
              </button>

              <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
                <span>⚙</span>
                Settings
              </button>

            </nav>
          </div>

          <div className="mt-auto px-3">
            <div className="border-t border-white/[0.06] pt-6">
              <p className="text-xs leading-5 text-slate-500">
                Autonomous gas management
                <br />
                for a smoother onchain experience.
              </p>

              <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-slate-700">
                ZEHN v0.1.0
              </p>
            </div>
          </div>
        </aside>

        {/* ───────────────── MAIN CONTENT ───────────────── */}

        <div className="flex-1">

          {/* Top bar */}

          <header className="flex flex-col gap-5 border-b border-white/[0.06] px-6 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">
                Wallet protection
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Your wallet, always ready.
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor your gas health and protect your wallet automatically.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs text-slate-400 sm:block">
                BSC Testnet
              </div>

              <ConnectButton />
            </div>

          </header>

          <div className="mx-auto max-w-[1500px] space-y-5 px-6 py-7 sm:px-8 lg:px-10">

            {/* ───────────────── WALLET HEALTH ───────────────── */}

            <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#111923] via-[#0c1219] to-[#090d13] p-7 lg:p-9">

              {/* Decorative glow */}

              <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-emerald-400/[0.08] blur-3xl" />

              <div className="pointer-events-none absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-violet-500/[0.06] blur-3xl" />

              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">

                <div>

                  <p className="text-sm font-medium text-slate-400">
                    Wallet Health
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Overall status of your wallet&apos;s gas readiness.
                  </p>

                  <div className="mt-7 flex items-center gap-5">

                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${healthStatus === "Healthy"
                        ? "border-emerald-400/20 bg-emerald-400/[0.08]"
                        : "border-amber-400/20 bg-amber-400/[0.08]"
                        }`}
                    >
                      <span className="text-3xl">
                        {healthStatus === "Healthy" ? "♥" : "!"}
                      </span>
                    </div>

                    <div>
                      <h2
                        className={`text-4xl font-semibold tracking-tight ${healthStatus === "Healthy"
                          ? "text-emerald-300"
                          : "text-amber-300"
                          }`}
                      >
                        {healthStatus}
                      </h2>

                      <p className="mt-2 max-w-xl text-sm text-slate-400">
                        {healthDescription}
                      </p>
                    </div>

                  </div>

                  <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05] px-4 py-2.5 text-xs text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                    {healthStatus === "Healthy"
                      ? "No action needed right now."
                      : "Zehn is monitoring your wallet."}
                  </div>

                </div>

                <div className="flex gap-12 lg:pr-8">

                  <div>
                    <p className="text-xs text-slate-500">
                      Estimated runway
                    </p>

                    <p className="mt-2 text-3xl font-semibold">
                      {estimatedRunwayDays !== null
                        ? `${estimatedRunwayDays.toFixed(0)}`
                        : "--"}
                      <span className="ml-1 text-sm font-normal text-slate-500">
                        days
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Target reserve
                    </p>

                    <p className="mt-2 text-3xl font-semibold">
                      {targetReserveDays !== null
                        ? `${targetReserveDays}`
                        : "--"}
                      <span className="ml-1 text-sm font-normal text-slate-500">
                        days
                      </span>
                    </p>
                  </div>

                </div>

              </div>
            </section>

            {/* ───────────────── METRICS ───────────────── */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {/* Wallet */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#0c1118] p-5 transition hover:border-white/[0.12]">

                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    Wallet Balance
                  </p>

                  <span className="text-lg text-violet-300">
                    ◇
                  </span>
                </div>

                <p className="mt-5 text-2xl font-semibold tracking-tight">
                  {walletBNB
                    ? `${walletBNB} BNB`
                    : address
                      ? "Loading..."
                      : "--"}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  Available wallet funds
                </p>

              </div>

              {/* Reserve */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#0c1118] p-5 transition hover:border-white/[0.12]">

                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    Gas Reserve
                  </p>

                  <span className="text-lg text-violet-300">
                    ◉
                  </span>
                </div>

                <p className="mt-5 text-2xl font-semibold tracking-tight">
                  {reserveBNB
                    ? `${reserveBNB} BNB`
                    : address
                      ? "Loading..."
                      : "--"}
                </p>

                <p
                  className={`mt-2 text-xs ${eligible
                    ? "text-emerald-400"
                    : "text-slate-600"
                    }`}
                >
                  {eligible ? "Eligible for protection" : "Reserve status"}
                </p>

              </div>

              {/* Yield */}

              <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.09] to-[#0c1118] p-5">

                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/[0.12] blur-2xl" />

                <div className="relative flex items-center justify-between">
                  <p className="text-sm text-slate-300">
                    Reserve Yield
                  </p>

                  <span className="text-lg text-emerald-300">
                    ♧
                  </span>
                </div>

                <p className="relative mt-5 text-2xl font-semibold tracking-tight text-emerald-300">
                  Coming soon
                </p>

                <p className="relative mt-2 text-xs leading-5 text-slate-500">
                  Your reserve could earn yield while remaining available for protection.
                </p>

              </div>

              {/* Protection */}

              <div className="rounded-2xl border border-emerald-400/10 bg-[#0c1118] p-5">

                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    Protection Status
                  </p>

                  <span className="relative flex h-5 w-9 items-center rounded-full bg-emerald-400/80">
                    <span className="absolute right-1 h-3.5 w-3.5 rounded-full bg-white" />
                  </span>
                </div>

                <p className="mt-5 flex items-center gap-2 text-2xl font-semibold text-emerald-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  Active
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Zehn monitors your wallet and can top up gas when needed.
                </p>

              </div>

            </section>

            {/* ───────────────── GAS + TRANSACTION ───────────────── */}

            <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">

              {/* Gas Usage */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#0c1118] p-6">

                <div className="flex items-start justify-between">

                  <div>
                    <p className="text-base font-semibold">
                      Gas Usage
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Your average daily gas spending.
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.07] px-3 py-2 text-xs text-slate-400">
                    Last 30 days
                  </div>

                </div>

                <div className="mt-7 flex items-end justify-between">

                  <div>
                    <p className="text-3xl font-semibold tracking-tight">
                      {averageGasBNB
                        ? `${averageGasBNB} BNB`
                        : address
                          ? "Loading..."
                          : "--"}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Average gas / day
                    </p>
                  </div>

                  <p
                    className={`text-sm font-medium ${gasUsageIncreasing
                      ? "text-amber-400"
                      : "text-emerald-400"
                      }`}
                  >
                    {gasUsageIncreasing
                      ? "↗ Increasing"
                      : gasUsageIncreasing === false
                        ? "→ Stable"
                        : "--"}
                  </p>

                </div>

                {/* Visual chart */}

                <div className="relative mt-8 h-36 overflow-hidden rounded-xl border border-white/[0.04] bg-[#080c11]">

                  <div className="absolute inset-0 opacity-30">
                    <div className="h-full w-full bg-[linear-gradient(to_right,transparent_49.5%,rgba(255,255,255,0.06)_50%,transparent_50.5%),linear-gradient(to_bottom,transparent_49.5%,rgba(255,255,255,0.06)_50%,transparent_50.5%)] bg-[size:25%_100%,100%_33.33%]" />
                  </div>

                  <svg
                    viewBox="0 0 800 180"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                  >
                    <defs>
                      <linearGradient
                        id="gasGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#34d399"
                          stopOpacity="0.28"
                        />
                        <stop
                          offset="100%"
                          stopColor="#34d399"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d="M0 145 C80 130, 90 145, 150 120 C210 100, 240 135, 300 115 C360 95, 400 125, 455 92 C510 65, 550 110, 610 76 C670 45, 700 75, 800 35 L800 180 L0 180 Z"
                      fill="url(#gasGradient)"
                    />

                    <path
                      d="M0 145 C80 130, 90 145, 150 120 C210 100, 240 135, 300 115 C360 95, 400 125, 455 92 C510 65, 550 110, 610 76 C670 45, 700 75, 800 35"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3"
                    />
                  </svg>

                </div>

                <div className="mt-3 flex justify-between text-[10px] text-slate-600">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>

              </div>

              {/* Transaction Safety */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#0c1118] p-6">

                <div>
                  <p className="text-base font-semibold">
                    Transaction Safety
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Check if your transaction can be executed safely.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">

                  <div>
                    <label className="text-xs text-slate-500">
                      Recipient Address
                    </label>

                    <input
                      className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#080c11] px-4 py-3 text-xs text-white outline-none transition placeholder:text-slate-700 focus:border-violet-400/50"
                      placeholder="0x..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">
                      Amount
                    </label>

                    <input
                      className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#080c11] px-4 py-3 text-xs text-white outline-none transition placeholder:text-slate-700 focus:border-violet-400/50"
                      placeholder="0.00 BNB"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                </div>

                <button
                  onClick={checkTransaction}
                  disabled={checkingTransaction}
                  className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-400 to-indigo-400 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkingTransaction
                    ? "Checking transaction..."
                    : "Check Transaction →"}
                </button>

                {recommendationError && (
                  <p className="mt-3 text-xs text-red-400">
                    {recommendationError}
                  </p>
                )}

                {recommendation && (
                  <div className="mt-4 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">

                    {recommendation.reasons?.map(
                      (reason: string, index: number) => (
                        <div
                          key={index}
                          className="flex gap-2 text-xs text-slate-400"
                        >
                          <span
                            className={
                              recommendation.decision === "NO_ACTION"
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }
                          >
                            {recommendation.decision === "NO_ACTION"
                              ? "✓"
                              : "•"}
                          </span>

                          <span>{reason}</span>
                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

            </section>

            {/* ───────────────── PROTECTION + ACTIVITY ───────────────── */}

            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">

              {/* Recommendation / Protection */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#0c1118] p-6">

                <div className="flex items-start justify-between gap-5">

                  <div>
                    <p className="text-base font-semibold">
                      Recommended Protection
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Based on your gas usage and target reserve.
                    </p>
                  </div>

                  {recommendation?.decision === "TOP_UP_RECOMMENDED" && (
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-amber-300">
                      Action needed
                    </span>
                  )}

                </div>

                {recommendation ? (
                  <div className="mt-6">

                    <div className="rounded-xl border border-white/[0.07] bg-[#080c11] p-5">

                      <p className="text-xs text-slate-500">
                        Recommended top-up
                      </p>

                      <p className="mt-2 text-3xl font-semibold">
                        {recommendation.reserve?.recommendedTopUpWei
                          ? `${Number(
                            formatEther(
                              BigInt(
                                recommendation.reserve
                                  .recommendedTopUpWei
                              )
                            )
                          ).toFixed(6)} BNB`
                          : "0 BNB"}
                      </p>

                      <p className="mt-2 text-xs text-slate-600">
                        Zehn will keep your wallet above the target gas reserve.
                      </p>

                    </div>

                    {recommendation.decision === "TOP_UP_RECOMMENDED" && (
                      <button
                        onClick={simulateTopUp}
                        disabled={simulating}
                        className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-400 to-indigo-400 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {simulating
                          ? "Simulating..."
                          : "Simulate Protection →"}
                      </button>
                    )}

                    {simulationError && (
                      <p className="mt-3 text-xs text-red-400">
                        {simulationError}
                      </p>
                    )}

                    {simulation && (
                      <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">

                        <p className="text-sm font-medium text-emerald-300">
                          ✓ Simulation successful
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          The Oracle verified that the protection transaction can be executed.
                        </p>

                        {!execution && (
                          <button
                            onClick={executeTopUp}
                            disabled={executing}
                            className="mt-4 w-full rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {executing
                              ? "Executing Protection..."
                              : "Protect Wallet →"}
                          </button>
                        )}

                      </div>
                    )}

                    {executionError && (
                      <p className="mt-3 text-xs text-red-400">
                        {executionError}
                      </p>
                    )}

                    {execution && (
                      <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">

                        <p className="text-sm font-medium text-emerald-300">
                          ✓ Protection executed successfully
                        </p>

                        <div className="mt-3 space-y-1 text-xs text-slate-500">

                          <p>
                            Amount:{" "}
                            <span className="text-white">
                              {execution.amountBNB} BNB
                            </span>
                          </p>

                          <p>
                            Block:{" "}
                            <span className="text-white">
                              {execution.blockNumber}
                            </span>
                          </p>

                          <p className="break-all">
                            Transaction:{" "}
                            <span className="text-white">
                              {execution.transactionHash}
                            </span>
                          </p>

                        </div>

                      </div>
                    )}

                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-dashed border-white/[0.08] bg-[#080c11] p-7 text-center">

                    <div className="text-2xl text-slate-700">
                      ◇
                    </div>

                    <p className="mt-3 text-sm text-slate-400">
                      Run a transaction safety check to receive a protection recommendation.
                    </p>

                  </div>
                )}

              </div>

              {/* Recent Activity */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#0c1118] p-6">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-base font-semibold">
                      Recent Activity
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Recent activity from your protected wallet.
                    </p>
                  </div>

                  <span className="text-lg text-violet-300">
                    ◌
                  </span>

                </div>

                <div className="mt-6 space-y-3">

                  {activityLoading ? (
                    <div className="rounded-xl border border-white/[0.05] bg-[#080c11] p-5 text-center">
                      <p className="text-xs text-slate-500">
                        Loading activity...
                      </p>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#080c11] p-6 text-center">
                      <p className="text-sm text-slate-400">
                        No recent activity
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Your reserve activity will appear here.
                      </p>
                    </div>
                  ) : (
                    activities.map((activity) => {

                      const isTopUp = activity.type === "topup";
                      const isDeposit = activity.type === "deposit";

                      return (
                        <a
                          key={activity.transactionHash}
                          href={`https://testnet.bscscan.com/tx/${activity.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#080c11] p-4 transition hover:border-white/[0.1] hover:bg-white/[0.02]"
                        >

                          <div className="flex items-center gap-3">

                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${isTopUp
                                ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-400"
                                : isDeposit
                                  ? "border-violet-400/15 bg-violet-400/[0.06] text-violet-300"
                                  : "border-amber-400/15 bg-amber-400/[0.06] text-amber-300"
                                }`}
                            >
                              {isTopUp ? "↗" : isDeposit ? "↓" : "↑"}
                            </div>

                            <div>
                              <p className="text-sm font-medium text-white">
                                {activity.label}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-600">
                                {formatActivityTime(activity.timestamp)}
                              </p>
                            </div>

                          </div>

                          <div className="text-right">

                            <p
                              className={`text-sm font-medium ${isTopUp
                                ? "text-emerald-300"
                                : isDeposit
                                  ? "text-violet-300"
                                  : "text-amber-300"
                                }`}
                            >
                              +{activity.amountBNB} BNB
                            </p>

                            <p className="mt-1 text-[10px] text-slate-700 transition group-hover:text-slate-500">
                              View transaction ↗
                            </p>

                          </div>

                        </a>
                      );
                    })
                  )}

                </div>

              </div>

            </section>

            {/* ───────────────── YIELD BANNER ───────────────── */}

            <section className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-r from-violet-500/[0.08] via-indigo-500/[0.05] to-transparent p-6">

              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/[0.12] blur-3xl" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-base font-semibold">
                    Your reserve works for you.
                  </p>

                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                    Zehn is designed to let your gas reserve earn yield while keeping funds available for wallet protection.
                  </p>
                </div>

                <span className="shrink-0 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-4 py-2 text-xs text-violet-300">
                  Yield strategy coming soon
                </span>

              </div>

            </section>

          </div>
        </div>
      </div>
    </main>
  );
}