import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN, AnchorProvider, Program } from "@coral-xyz/anchor";
import { PROGRAM_ID, USDC_MINT, REGISTRY_PDA, RPC_URL } from "./constants";

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
 * Derive staker_receipt PDA.
 * BUG FIX: The IDL seeds for staker_receipt use agent_state.agent_pubkey (read from
 * AgentState account on-chain), NOT the raw agentPubkey passed by the caller.
 * Anchor resolves this automatically when we pass agent_state in accounts — so we
 * must NOT manually derive it and pass it; instead let Anchor handle it via the IDL.
 */
export function deriveStakerReceipt(
  agentPubkey: PublicKey,
  staker: PublicKey
): PublicKey {
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
  agentPubkeyStr: string,
  amountUsdc: number,
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
    signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
  }
): Promise<TxResult> {
  try {
    const agentKey = new PublicKey(agentPubkeyStr);
    const staker = wallet.publicKey;

    const connection = new Connection(RPC_URL, "confirmed");

    // BUG FIX 1: AnchorProvider requires a wallet with signAllTransactions.
    // Wrap the wallet-adapter wallet into a proper AnchorProvider-compatible object.
    const anchorWallet = {
      publicKey: staker,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions:
        wallet.signAllTransactions?.bind(wallet) ??
        (async (txs: Transaction[]) => {
          const signed: Transaction[] = [];
          for (const tx of txs) {
            signed.push(await wallet.signTransaction(tx));
          }
          return signed;
        }),
    };

    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    const idl = (await import("../idl/axiom6.json")) as any;
    const program = new Program(idl, provider);

    const agentState = deriveAgentState(agentKey);

    // BUG FIX 2: Fetch agentState to get the real vault_usdc_ata stored on-chain.
    // Using camelCase field names as Anchor deserializes to camelCase.
    const agentStateData = await (program.account as any).agentState.fetch(
      agentState
    );
    const vaultUsdcAta = agentStateData.vaultUsdcAta as PublicKey;

    // Staker's own USDC ATA
    const stakerUsdcAta = await getAssociatedTokenAddress(USDC_MINT, staker);

    const tx = new Transaction();

    // Create staker USDC ATA if it doesn't exist yet
    const stakerAtaInfo = await connection.getAccountInfo(stakerUsdcAta);
    if (!stakerAtaInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          staker,
          stakerUsdcAta,
          staker,
          USDC_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // BUG FIX 3: The IDL account names use snake_case on-chain but Anchor's
    // JS client expects camelCase keys. Pass camelCase here.
    // Also: staker_receipt is a PDA seeded from agent_state.agent_pubkey (on-chain field),
    // so we must NOT pass it manually — Anchor resolves it automatically via the IDL.
    const amount = new BN(Math.floor(amountUsdc * 1_000_000));

    const ix = await (program.methods as any)
      .stakeUsdc(amount)
      .accounts({
        registry: REGISTRY_PDA,
        agentState,
        // stakerReceipt is omitted — Anchor auto-derives it from IDL PDA seeds
        staker,
        stakerUsdcAta,
        vaultUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = staker;

    const signed = await anchorWallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return { ok: true, signature };
  } catch (err: any) {
    console.error("[stakeUsdc]", err);
    // Surface Anchor's custom error message when available
    const msg: string =
      err?.logs?.join("\n") ?? err?.message ?? String(err);
    return { ok: false, error: msg };
  }
}

/**
 * Unstake shares from an agent vault.
 */
export async function unstakeShares(
  agentPubkeyStr: string,
  sharesToBurn: number,
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
    signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
  }
): Promise<TxResult> {
  try {
    const agentKey = new PublicKey(agentPubkeyStr);
    const staker = wallet.publicKey;

    const connection = new Connection(RPC_URL, "confirmed");

    const anchorWallet = {
      publicKey: staker,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions:
        wallet.signAllTransactions?.bind(wallet) ??
        (async (txs: Transaction[]) => {
          const signed: Transaction[] = [];
          for (const tx of txs) signed.push(await wallet.signTransaction(tx));
          return signed;
        }),
    };

    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    const idl = (await import("../idl/axiom6.json")) as any;
    const program = new Program(idl, provider);

    const agentState = deriveAgentState(agentKey);
    const agentStateData = await (program.account as any).agentState.fetch(agentState);
    const vaultUsdcAta = agentStateData.vaultUsdcAta as PublicKey;

    const stakerUsdcAta = await getAssociatedTokenAddress(USDC_MINT, staker);

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

    const shares = new BN(sharesToBurn);

    const ix = await (program.methods as any)
      .unstake(shares)
      .accounts({
        registry: REGISTRY_PDA,
        agentState,
        staker,
        stakerUsdcAta,
        vaultUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = staker;

    const signed = await anchorWallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return { ok: true, signature };
  } catch (err: any) {
    console.error("[unstakeShares]", err);
    const msg: string = err?.logs?.join("\n") ?? err?.message ?? String(err);
    return { ok: false, error: msg };
  }
}
