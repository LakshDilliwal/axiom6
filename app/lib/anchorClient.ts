import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { RPC_URL } from "./constants";

export async function getProgram(wallet: any) {
  const connection = new Connection(RPC_URL, "confirmed");
  const idl = await import("../idl/axiom6.json");
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(idl as any, provider);
  return { program, connection, provider };
}
