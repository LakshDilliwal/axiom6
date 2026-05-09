import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PROGRAM_ID, USDC_MINT, RPC_URL } from "./constants";

export type StakeResult =
  | { ok: true; signature: string }
  | { ok: false; error: string };

async function loadProgram(connection: Connection, wallet: any) {
  const idl = await import("../idl/axiom6.json");
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program(idl as any, provider);
}

/**
 * Step 1 — Initialize the vault PDA + its USDC ATA if not yet on-chain.
 * Safe to call multiple times — skips if already initialized.
 */
async function ensureVaultInitialized(
  connection: Connection,
  program: Program<any>,
  vaultPda: PublicKey,
  vaultUsdc: PublicKey,
  agentKey: PublicKey,
  wallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> }
) {
  const vaultInfo = await connection.getAccountInfo(vaultPda);
  const vaultUsdcInfo = await connection.getAccountInfo(vaultUsdc);

  // Both already exist — nothing to do
  if (vaultInfo && vaultUsdcInfo) return;

  const tx = new Transaction();

  // Init vault PDA if needed
  if (!vaultInfo) {
    const initIx = await (program.methods as any)
      .initializeVault()
      .accounts({
        vault: vaultPda,
        agent: agentKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();
    tx.add(initIx);
  }

  // Create vault USDC ATA if needed
  if (!vaultUsdcInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        vaultUsdc,
        vaultPda,
        USDC_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  if (tx.instructions.length === 0) return;

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  console.log("[axiom6] vault initialized:", sig);
}

/**
 * Main stake function.
 * Automatically initializes vault + ATA on first call.
 */
export async function stakeUsdc(
  agentPubkey: string,
  amountUsdc: number,
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<StakeResult> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const agentKey = new PublicKey(agentPubkey);
    const user = wallet.publicKey;

    // Derive PDAs
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), agentKey.toBuffer()],
      PROGRAM_ID
    );
    const [stakerReceipt] = PublicKey.findProgramAddressSync(
      [Buffer.from("staker"), vaultPda.toBuffer(), user.toBuffer()],
      PROGRAM_ID
    );

    // Token accounts
    const userUsdc = await getAssociatedTokenAddress(USDC_MINT, user);
    const vaultUsdc = await getAssociatedTokenAddress(USDC_MINT, vaultPda, true);

    const program = await loadProgram(connection, wallet);

    // Auto-init vault + ATA if needed (sends separate tx)
    await ensureVaultInitialized(
      connection, program, vaultPda, vaultUsdc, agentKey, wallet
    );

    // Build stake tx
    const tx = new Transaction();
    const lamports = new BN(Math.floor(amountUsdc * 1_000_000));

    const stakeIx = await (program.methods as any)
      .stake(lamports)
      .accounts({
        vault: vaultPda,
        stakerReceipt,
        userUsdc,
        vaultUsdc,
        usdcMint: USDC_MINT,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    tx.add(stakeIx);

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = user;

    const signed = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    return { ok: true, signature };
  } catch (err: any) {
    console.error("[stakeUsdc] error:", err);
    return { ok: false, error: err?.message ?? "Unknown error" };
  }
}
