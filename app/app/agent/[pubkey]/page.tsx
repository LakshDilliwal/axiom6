'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AgentDetail() {
  const { pubkey } = useParams<{pubkey:string}>();
  const [agent, setAgent] = useState<any>(null);
  const [stakeAmt, setStakeAmt] = useState('');
  const [staking, setStaking] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (pubkey) api.getAgent(pubkey).then(setAgent);
  }, [pubkey]);

  const handleStake = async () => {
    if (!stakeAmt || parseFloat(stakeAmt) <= 0) return;
    setStaking(true); setMsg('');
    const res = await api.stake({ wallet: 'devnet-demo', agentPubkey: pubkey, amountUsdc: parseFloat(stakeAmt) });
    setMsg(res.success ? `✅ Staked! You got ${res.shares?.toFixed(4)} shares.` : '❌ Failed');
    setStaking(false);
  };

  if (!agent) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-gray-500 animate-pulse">Loading agent...</div>
    </div>
  );

  const pnl = agent.cumulativePnl || 0;
  const aps = agent.currentAps || 1;
  const roi = ((aps - 1) * 100).toFixed(2);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/leaderboard" className="text-gray-500 hover:text-white text-sm mb-6 inline-flex items-center gap-1">
          ← Leaderboard
        </Link>

        {/* Hero */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{agent.agentName}</h1>
            <p className="text-gray-500 font-mono text-xs mt-1 break-all">{agent.agentPubkey}</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-xs border border-green-800">● Active</span>
              <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">{agent.strategy}</span>
            </div>
          </div>
          <div className="text-right bg-blue-950/30 border border-blue-900/50 rounded-xl px-6 py-4">
            <div className="text-4xl font-bold text-blue-400 font-mono">{aps.toFixed(6)}</div>
            <div className="text-gray-400 text-xs mt-1">Assets Per Share</div>
            <div className={`text-sm font-semibold mt-1 ${parseFloat(roi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {parseFloat(roi) >= 0 ? '+' : ''}{roi}% ROI
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Cumulative PnL', value: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, color: pnl >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Total Trades', value: agent.tradeCount || 0, color: 'text-white' },
            { label: 'Vault TVL', value: `$${(agent.tvlUsdc || 0).toLocaleString()}`, color: 'text-yellow-400' },
            { label: 'Perf Fee', value: `${((agent.performanceFeeBps || 0) / 100).toFixed(0)}%`, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Fee split */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Profit Distribution</h3>
          <div className="flex h-5 rounded-full overflow-hidden mb-3">
            <div style={{width:'78%'}} className="bg-blue-600 flex items-center justify-center text-xs text-white font-medium">78%</div>
            <div style={{width:'20%'}} className="bg-purple-600 flex items-center justify-center text-xs text-white font-medium">20%</div>
            <div style={{width:'2%'}} className="bg-gray-600"></div>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            <span><span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1.5"></span>78% → Stakers</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-purple-600 mr-1.5"></span>{((agent.performanceFeeBps||0)/100).toFixed(0)}% → Developer</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-gray-600 mr-1.5"></span>2% → Protocol</span>
          </div>
        </div>

        {/* Stake panel */}
        <div className="bg-gray-900 border border-blue-900/60 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">Stake USDC</h3>
            <span className="px-2 py-0.5 bg-yellow-900/40 text-yellow-500 border border-yellow-800/50 rounded text-xs">Devnet</span>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Your USDC goes into the Glass Box Vault — the agent can trade it but <strong className="text-white">can never withdraw it</strong> to their own wallet.
          </p>
          <div className="flex gap-3">
            <input
              type="number" min="0" placeholder="Amount USDC"
              value={stakeAmt} onChange={e => setStakeAmt(e.target.value)}
              className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button onClick={handleStake} disabled={staking || !stakeAmt}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-6 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap">
              {staking ? 'Staking...' : 'Stake →'}
            </button>
          </div>
          {msg && <p className="mt-3 text-sm">{msg}</p>}
        </div>

        {/* Trades */}
        <div>
          <h3 className="font-semibold mb-3">Trade History
            <span className="ml-2 text-xs text-gray-600 font-normal">({(agent.trades||[]).length} trades)</span>
          </h3>
          {(agent.trades||[]).length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
              <div className="text-4xl mb-3">📈</div>
              <p className="text-gray-500 text-sm">No trades reported yet</p>
              <p className="text-gray-600 text-xs mt-1">Agents report trades via the API after each swap</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...(agent.trades||[])].reverse().map((t: any, i: number) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="font-mono text-xs text-gray-500">{t.txSignature?.slice(0,20)}...</span>
                  <span className={`font-mono text-sm font-semibold ${t.pnlUsdc >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {t.pnlUsdc >= 0 ? '+' : ''}${t.pnlUsdc?.toFixed(2)}
                  </span>
                  <span className="text-gray-600 text-xs">{new Date(t.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
