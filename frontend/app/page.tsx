"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

export default function Home() {
  const [walletBalance, setWalletBalance] = useState<string | null>(null);

  useEffect(() => {
    fetch(
      "http://localhost:3000/wallet/0x9965b8727BadbcB1Ed93965c213872C575F8931F"
    )
      .then((res) => res.json())
      .then((data) => {
        setWalletBalance(data.balanceWei);
      })
      .catch((error) => {
        console.error("Failed to fetch wallet balance:", error);
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              AutoGasReserve
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Never worry about gas again.
            </p>
          </div>

          <ConnectButton />
        </header>

        {/* Main balances */}
        <section className="grid gap-5 md:grid-cols-2">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Wallet Balance
            </p>

            <p className="mt-3 text-3xl font-bold">
              {walletBalance
                ? `${(Number(walletBalance) / 1e18).toFixed(6)} BNB`
                : "Loading..."}
            </p>

            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
              <span>●</span>
              Protected
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Gas Reserve
            </p>

            <p className="mt-3 text-3xl font-bold">
              0.0599995 BNB
            </p>

            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
              <span>●</span>
              Eligible
            </div>
          </div>

        </section>

        {/* Gas analytics */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Gas Analytics
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <p className="text-sm text-slate-400">
                Average / day
              </p>

              <p className="mt-2 font-semibold">
                0.00001135 BNB
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">
                Gas usage
              </p>

              <p className="mt-2 font-semibold text-amber-400">
                ↑ Increasing
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">
                Estimated runway
              </p>

              <p className="mt-2 font-semibold">
                385 days
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">
                Target reserve
              </p>

              <p className="mt-2 font-semibold">
                14 days
              </p>
            </div>

          </div>
        </section>

        {/* Transaction safety */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Transaction Safety
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            <div>
              <label className="text-sm text-slate-400">
                Recipient
              </label>

              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                placeholder="0x..."
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">
                Amount
              </label>

              <input
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
                placeholder="0.00 BNB"
              />
            </div>

          </div>

          <button className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950">
            Check Transaction
          </button>
        </section>

        {/* Recommendation */}
        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="flex items-start justify-between gap-4">

            <div>
              <p className="text-sm font-semibold text-amber-400">
                Gas Protection
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Top-up recommended
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Your wallet is approaching the gas safety threshold.
                A reserve top-up can keep your wallet funded for
                upcoming transactions.
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-400">
                Recommended
              </p>

              <p className="mt-1 text-2xl font-bold">
                0.001011 BNB
              </p>
            </div>

          </div>

          <button className="mt-6 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950">
            Simulate Top-up
          </button>
        </section>

      </div>
    </main>
  );
}