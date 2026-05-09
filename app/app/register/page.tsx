"use client";
import { useState } from "react";
import { useWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getAxiom6Program, getRegistryPDA } from "../../lib/axiom6";

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

const STRATEGIES = [
  "Momentum Scalper","Mean Reversion","Arbitrage Hunter",
  "ML Trend Follow","Grid Trading","Sentiment Analysis",
  "Multi-DEX Arb","Funding Rate",
];

export default function Register() {
  const { connected, publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [fee, setFee] = useState("10");
  const [status, setStatus] = useState<"idle"|"pending"|"success"|"error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [agentSecret, setAgentSecret] = useState("");

  const handleDeploy = async () => {
    if (!connected || !wallet || !publicKey) {
      setErrorMsg("Connect your wallet first."); setStatus("error"); return;
    }
    if (!name.trim()) {
      setErrorMsg("Enter an agent name."); setStatus("error"); return;
    }
    const feeBps = Math.round(parseFloat(fee) * 100);
    if (feeBps > 3000) {
      setErrorMsg("Max performance fee is 30%."); setStatus("error"); return;
    }
    try {
      setStatus("pending");
      const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
      const program = getAxiom6Program(provider);
      const [registryPDA] = getRegistryPDA();

      const agentKeypair = Keypair.generate();
      const agentPubkey = agentKeypair.publicKey;

      const [agentStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), agentPubkey.toBuffer()],
        program.programId
      );

      const vaultUsdcAta = await getAssociatedTokenAddress(USDC_MINT, agentStatePDA, true);

      await (program.methods as any)
        .registerAgent(feeBps, [USDC_MINT])
        .accounts({
          registry: registryPDA,
          agentState: agentStatePDA,
          developer: publicKey,
          agentPubkey: agentPubkey,
          vaultUsdcAta: vaultUsdcAta,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setAgentAddress(agentStatePDA.toBase58());
      setAgentSecret(Buffer.from(agentKeypair.secretKey).toString("base64"));
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err?.message || "Deploy failed");
      setStatus("error");
    }
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-xl font-bold text-white mb-1">Deploy Agent</h1>
      <p className="text-xs text-gray-500 mb-8">Register your AI trading agent on Solana devnet</p>

      {status === "success" ? (
        <div className="border border-[#01696f]/40 bg-[#01696f]/10 rounded-lg p-6 space-y-4">
          <p className="text-[#01696f] text-sm font-medium text-center">✓ Agent Deployed On-Chain</p>

          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Agent State PDA</p>
            <p className="text-xs font-mono text-white break-all bg-[#111] rounded p-2">{agentAddress}</p>
          </div>

          <div>
            <p className="text-yellow-500 text-[10px] uppercase tracking-widest mb-1">⚠ Agent Secret Key — save this now</p>
            <p className="text-[10px] font-mono text-yellow-300 break-all bg-[#1a1000] border border-yellow-900/40 rounded p-2">{agentSecret}</p>
            <p className="text-[9px] text-gray-600 mt-1">Base64-encoded secret key. Store in your .env as AGENT_SECRET_KEY. This will not be shown again.</p>
          </div>

          <button
            onClick={() => { setStatus("idle"); setName(""); setAgentSecret(""); }}
            className="w-full mt-2 px-4 py-2 border border-[#1f1f1f] text-gray-400 hover:text-white rounded text-xs transition-colors"
          >
            Deploy Another
          </button>
        </div>
      ) : (
        <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-6 flex flex-col gap-5">
          {status === "error" && (
            <div className="border border-red-900/50 bg-red-900/10 rounded p-3">
              <p className="text-red-400 text-xs font-mono">{errorMsg}</p>
            </div>
          )}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Agent Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alpha-7"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white font-mono focus:border-[#01696f] outline-none transition-colors placeholder:text-gray-700"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Strategy</label>
            <select
              value={strategy} onChange={e => setStrategy(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white font-mono focus:border-[#01696f] outline-none cursor-pointer"
            >
              {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Performance Fee (%) — max 30%</label>
            <input
              type="number" value={fee} onChange={e => setFee(e.target.value)} min="0" max="30" step="0.5"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white font-mono focus:border-[#01696f] outline-none transition-colors"
            />
          </div>
          <div className="border border-[#1f1f1f] rounded p-3 bg-[#0a0a0a]">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Wallet</p>
            <p className="text-xs font-mono text-gray-300">{connected ? publicKey?.toBase58() : "Not connected"}</p>
          </div>
          <button
            onClick={handleDeploy} disabled={status === "pending"}
            className="w-full py-2.5 bg-[#01696f] hover:bg-[#01595e] disabled:opacity-50 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {status === "pending" ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deploying...</>
            ) : "Deploy Agent on Devnet"}
          </button>
        </div>
      )}
    </main>
  );
}
