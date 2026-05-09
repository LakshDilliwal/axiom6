import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { PROGRAM_ID, USDC_MINT, REGISTRY_PDA } from "./constants";
import { getProgram } from "./anchorClient";
import { deriveAgentState } from "./stakeTransaction";

export type RegisterResult =
  | { ok: true; agentPubkey: string; signature: string }
  | { ok: false; error: string };

/**
 * Register a new agent on-chain.
 * - Creates a fresh agent keypair
 * - Creates the vault USDC ATA for that agent
 * - Calls register_agent instruction
 * Returns the agent pubkey so the frontend can store/display it.
 */
export async function registerAgent(
  performanceFeeBps: number,
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<RegisterResult> {
  try {
    const developer = wallet.publicKey;
    const { program, connection } = await getProgram(wallet);

    // Fresh agent keypair — in production this should be a dedicated agent wallet
    const agentKeypair = Keypair.generate();
    const agentPubkey = agentKeypair.publicKey;

    const agentState = deriveAgentState(agentPubkey);

    // Vault USDC ATA owned by agent_state PDA
    const vaultUsdcAta = await getAssociatedTokenAddress(
      USDC_MINT, agentState, true,
      TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction();

    // Create vault USDC ATA
    const ataInfo = await connection.getAccountInfo(vaultUsdcAta);
    if (!ataInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          developer, vaultUsdcAta, agentState, USDC_MINT,
          TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    const ix = await (program.methods as any)
      .registerAgent(new BN(performanceFeeBps), [USDC_MINT])
      .accounts({
        registry: REGISTRY_PDA,
        agentState,
        developer,
        agentPubkey,
        vaultUsdcAta,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    tx.add(ix);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = developer;

    // agent keypair must co-sign if required by program
    tx.partialSign(agentKeypair);

    const signed = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    return { ok: true, agentPubkey: agentPubkey.toBase58(), signature };
  } catch (err: any) {
    console.error("[registerAgent]", err);
    return { ok: false, error: err?.message ?? String(err) };
  }
}
