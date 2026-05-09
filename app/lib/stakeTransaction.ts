import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { PROGRAM_ID, USDC_MINT, REGISTRY_PDA } from "./constants";
import { getProgram } from "./anchorClient";

export type TxResult =
  | { ok: true; signature: string }
  | { ok: false; error: string };

/**
 * Derive agent_state PDA — seeds: ["agent", agent_pubkey]
 */
export function deriveAgentState(agentPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), agentPubkey.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Derive staker_receipt PDA — seeds: ["receipt", agent_pubkey, staker]
 */
export function deriveStakerReceipt(agentPubkey: PublicKey, staker: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), agentPubkey.toBuffer(), staker.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Stake USDC into an agent vault.
 * agentPubkey — the agent's actual keypair pubkey (full base58, stored in AgentState)
 * amountUsdc  — human amount e.g. 100 = 100 USDC
 */
export async function stakeUsdc(
  agentPubkey: string,
  amountUsdc: number,
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<TxResult> {
  try {
    const agentKey = new PublicKey(agentPubkey);
    const staker = wallet.publicKey;
    const { program, connection } = await getProgram(wallet);

    const agentState = deriveAgentState(agentKey);
    const stakerReceipt = deriveStakerReceipt(agentKey, staker);

    // Fetch agentState to get the vault_usdc_ata stored on-chain
    const agentStateData = await (program.account as any).agentState.fetch(agentState);
    const vaultUsdcAta = agentStateData.vaultUsdcAta as PublicKey;

    // Staker's own USDC ATA
    const stakerUsdcAta = await getAssociatedTokenAddress(USDC_MINT, staker);

    // Create staker USDC ATA if missing
    const tx = new Transaction();
    const stakerAtaInfo = await connection.getAccountInfo(stakerUsdcAta);
    if (!stakerAtaInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          staker, stakerUsdcAta, staker, USDC_MINT,
          TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    const amount = new BN(Math.floor(amountUsdc * 1_000_000));

    const ix = await (program.methods as any)
      .stakeUsdc(amount)
      .accounts({
        registry: REGISTRY_PDA,
        agentState,
        stakerReceipt,
        staker,
        stakerUsdcAta,
        vaultUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    tx.add(ix);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = staker;

    const signed = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    return { ok: true, signature };
  } catch (err: any) {
    console.error("[stakeUsdc]", err);
    return { ok: false, error: err?.message ?? String(err) };
  }
}
