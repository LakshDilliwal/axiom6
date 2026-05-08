import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
// In a real environment we would import the generated types
// import { Axiom6 } from "../target/types/axiom6";

describe("axiom6", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  
  // Since we don't have the generated types in this standalone script, we'll use anchor.workspace
  const program = anchor.workspace.Axiom6 as Program<any>;
  
  const authority = Keypair.generate();
  const treasury = Keypair.generate();
  const developer = Keypair.generate();
  const agentKeypair = Keypair.generate();
  
  let registryPda: PublicKey;
  let registryBump: number;
  let agentStatePda: PublicKey;
  let agentBump: number;

  before(async () => {
    [registryPda, registryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry")],
      program.programId
    );

    [agentStatePda, agentBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), agentKeypair.publicKey.toBuffer()],
      program.programId
    );

    // Airdrop SOL to authority and developer
    const sig1 = await provider.connection.requestAirdrop(authority.publicKey, 1000000000);
    const sig2 = await provider.connection.requestAirdrop(developer.publicKey, 1000000000);
    await provider.connection.confirmTransaction(sig1);
    await provider.connection.confirmTransaction(sig2);
  });

  it("Is initialized!", async () => {
    const protocolFeeBps = 200;
    
    await program.methods
      .initializeRegistry(protocolFeeBps)
      .accounts({
        registry: registryPda,
        authority: authority.publicKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const registryAcc = await program.account.registry.fetch(registryPda);
    expect(registryAcc.protocolFeeBps).to.equal(protocolFeeBps);
    expect(registryAcc.authority.toBase58()).to.equal(authority.publicKey.toBase58());
  });

  it("Registers an agent", async () => {
    const performanceFeeBps = 2000;
    // Mock ATA for vault USDC
    const vaultUsdcAta = Keypair.generate().publicKey; 
    const whitelistedMints = [Keypair.generate().publicKey];

    await program.methods
      .registerAgent(performanceFeeBps, whitelistedMints)
      .accounts({
        registry: registryPda,
        agentState: agentStatePda,
        developer: developer.publicKey,
        agentPubkey: agentKeypair.publicKey,
        vaultUsdcAta: vaultUsdcAta,
        systemProgram: SystemProgram.programId,
      })
      .signers([developer])
      .rpc();

    const agentAcc = await program.account.agentState.fetch(agentStatePda);
    expect(agentAcc.performanceFeeBps).to.equal(performanceFeeBps);
    expect(agentAcc.developer.toBase58()).to.equal(developer.publicKey.toBase58());
    expect(agentAcc.status.active).to.not.be.undefined;
  });

  it("Pauses the agent", async () => {
    await program.methods
      .pauseAgent()
      .accounts({
        agentState: agentStatePda,
        authority: authority.publicKey,
        registry: registryPda,
      })
      .signers([authority])
      .rpc();

    const agentAcc = await program.account.agentState.fetch(agentStatePda);
    expect(agentAcc.status.paused).to.not.be.undefined;
  });
});
