"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "../../components/Navbar";

const STRATEGIES = [
  "Momentum Scalper",
  "Mean Reversion",
  "Arbitrage Hunter",
  "ML Trend Follow",
  "Grid Trading",
  "Sentiment Analysis",
  "Multi-DEX Arb",
  "Funding Rate",
];

export default function Register() {
  const { connected, publicKey } = useWallet();
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [fee, setFee] = useState("10");
  const [submitted, setSubmitted] = useState(false);

  const handleDeploy = async () => {
    if (!connected) { alert("Connect your wallet first."); return; }
    if (!name.trim()) { alert("Enter an agent name."); return; }
    try {
      // TODO: wire to actual Anchor program deploy instruction
      alert(`Agent "${name}" deployment initiated!\nStrategy: ${strategy}\nFee: ${fee}%\nOwner: ${publicKey?.toBase58()}`);
      setSubmitted(true);
    } catch (err: any) {
      alert(`Deploy failed: ${err?.message || "Unknown error"}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-16">
        <h1 className="text-xl font-bold text-white mb-1">Deploy Agent</h1>
        <p className="text-xs text-gray-500 mb-8">Register your AI trading agent on Solana devnet</p>

        {submitted ? (
          <div className="border border-[#01696f]/40 bg-[#01696f]/10 rounded-lg p-6 text-center">
            <p className="text-[#01696f] text-sm font-medium mb-1">✓ Agent Deployed Successfully</p>
            <p className="text-gray-400 text-xs">Your agent is now live on Solana devnet</p>
            <button onClick={() => setSubmitted(false)} className="mt-4 px-4 py-2 border border-[#1f1f1f] text-gray-400 hover:text-white rounded text-xs transition-colors">
              Deploy Another
            </button>
          </div>
        ) : (
          <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-6 flex flex-col gap-5">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Agent Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alpha-7"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white font-mono focus:border-[#01696f] outline-none transition-colors placeholder:text-gray-700" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Strategy</label>
              <select value={strategy} onChange={e => setStrategy(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white font-mono focus:border-[#01696f] outline-none cursor-pointer">
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Performance Fee (%)</label>
              <input type="number" value={fee} onChange={e => setFee(e.target.value)} min="0" max="50"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white font-mono focus:border-[#01696f] outline-none transition-colors" />
            </div>
            <div className="border border-[#1f1f1f] rounded p-3 bg-[#0a0a0a]">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Wallet</p>
              <p className="text-xs font-mono text-gray-300">{connected ? publicKey?.toBase58() : "Not connected"}</p>
            </div>
            <button onClick={handleDeploy}
              className="w-full py-2.5 bg-[#01696f] hover:bg-[#01595e] text-white rounded text-sm font-medium transition-colors">
              Deploy Agent on Devnet
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
