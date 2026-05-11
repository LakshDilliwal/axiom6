"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Agent {
  agentPubkey: string;
  agentName: string;
  strategy: string;
  currentAps: number;
  tradeCount: number;
  tvl?: number;
  likes: number;
  dislikes: number;
  myVote?: "like" | "dislike" | null;
}

export default function Leaderboard() {
  const { publicKey } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "momentum">("all");
  const [sortBy, setSortBy] = useState<"tvl" | "apy" | "trades">("tvl");
  const [votingId, setVotingId] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API}/api/agents`);
      const data = await res.json();
      // attach myVote from localStorage cache (optimistic)
      const stored = JSON.parse(localStorage.getItem("ax6_votes") || "{}");
      const enriched = (data.agents || []).map((a: Agent) => ({
        ...a,
        myVote: stored[a.agentPubkey] ?? null,
      }));
      setAgents(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleVote = async (pubkey: string, type: "like" | "dislike") => {
    const voter = publicKey?.toBase58();
    if (!voter) { alert("Connect your wallet to vote"); return; }
    setVotingId(pubkey + type);
    try {
      const res = await fetch(`${API}/api/agents/${pubkey}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter, type }),
      });
      const data = await res.json();
      // update local cache
      const stored = JSON.parse(localStorage.getItem("ax6_votes") || "{}");
      stored[pubkey] = data.myVote;
      localStorage.setItem("ax6_votes", JSON.stringify(stored));
      // patch agent in state
      setAgents(prev => prev.map(a =>
        a.agentPubkey === pubkey
          ? { ...a, likes: data.likes, dislikes: data.dislikes, myVote: data.myVote }
          : a
      ));
    } catch (e) { console.error(e); }
    finally { setVotingId(null); }
  };

  const filtered = agents.filter(a => filter === "all" || a.strategy?.toLowerCase().includes("momentum"));
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "apy") return (b.currentAps ?? 0) - (a.currentAps ?? 0);
    if (sortBy === "trades") return (b.tradeCount ?? 0) - (a.tradeCount ?? 0);
    return (b.tvl ?? 0) - (a.tvl ?? 0);
  });

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-xl font-bold text-white mb-1">Agent Leaderboard</h1>
      <p className="text-xs text-gray-500 mb-8">Live from Axiom6 backend · Updated on every trade report</p>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2">
          {(["all", "momentum"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono transition-colors ${
                filter === f
                  ? "bg-[#01696f]/20 text-[#01696f] border border-[#01696f]/40"
                  : "text-gray-500 border border-[#1f1f1f] hover:text-gray-300"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["tvl", "apy", "trades"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider transition-colors ${
                sortBy === s
                  ? "bg-[#01696f]/20 text-[#01696f] border border-[#01696f]/40"
                  : "text-gray-500 border border-[#1f1f1f] hover:text-gray-300"
              }`}>
              {s} {sortBy === s ? "↓" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#1f1f1f] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1f1f1f] text-[10px] font-mono text-gray-600 uppercase tracking-widest">
              <th className="px-4 py-3 text-left w-8">#</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Strategy</th>
              <th className="px-4 py-3 text-right">TVL</th>
              <th className="px-4 py-3 text-right">APS</th>
              <th className="px-4 py-3 text-right">Trades</th>
              <th className="px-4 py-3 text-center">Rating</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-xs font-mono">Loading agents...</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-xs font-mono">No agents found</td></tr>
            ) : sorted.map((agent, i) => (
              <tr key={agent.agentPubkey}
                className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#111] transition-colors group">
                <td className="px-4 py-4 text-gray-600 font-mono text-xs">#{i + 1}</td>
                <td className="px-4 py-4">
                  <p className="text-white font-semibold text-sm">{agent.agentName}</p>
                  <p className="text-gray-600 font-mono text-[10px]">{agent.agentPubkey.slice(0,8)}...{agent.agentPubkey.slice(-4)}</p>
                </td>
                <td className="px-4 py-4">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-[#1f1f1f] text-gray-400">
                    {agent.strategy || "—"}
                  </span>
                </td>
                <td className="px-4 py-4 text-right font-mono text-xs text-gray-400">{agent.tvl != null ? `$${agent.tvl.toFixed(2)}` : "—"}</td>
                <td className="px-4 py-4 text-right font-mono text-sm font-bold" style={{ color: "#01696f" }}>
                  {(agent.currentAps ?? 0).toFixed(4)}
                </td>
                <td className="px-4 py-4 text-right font-mono text-xs text-gray-400">{agent.tradeCount ?? 0}</td>

                {/* ── Rating ── */}
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-3">
                    {/* Like */}
                    <button
                      onClick={() => handleVote(agent.agentPubkey, "like")}
                      disabled={votingId === agent.agentPubkey + "like"}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                        agent.myVote === "like"
                          ? "bg-[#01696f]/20 text-[#01696f] border border-[#01696f]/50"
                          : "text-gray-500 border border-[#1f1f1f] hover:text-white hover:border-[#333]"
                      }`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={agent.myVote === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                      </svg>
                      <span>{agent.likes ?? 0}</span>
                    </button>

                    {/* Dislike */}
                    <button
                      onClick={() => handleVote(agent.agentPubkey, "dislike")}
                      disabled={votingId === agent.agentPubkey + "dislike"}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                        agent.myVote === "dislike"
                          ? "bg-red-900/20 text-red-400 border border-red-900/50"
                          : "text-gray-500 border border-[#1f1f1f] hover:text-white hover:border-[#333]"
                      }`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={agent.myVote === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                        <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                      </svg>
                      <span>{agent.dislikes ?? 0}</span>
                    </button>
                  </div>
                </td>

                <td className="px-4 py-4 text-right">
                  <Link href={`/agent/${agent.agentPubkey}`}
                    className="text-[11px] font-mono text-gray-500 hover:text-[#01696f] flex items-center gap-1 justify-end transition-colors">
                    ★ View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-center text-[10px] font-mono text-gray-600">
        {sorted.length} agents · Live data
        {!publicKey && <span className="ml-2 text-gray-700">· Connect wallet to vote</span>}
      </p>
    </main>
  );
}
