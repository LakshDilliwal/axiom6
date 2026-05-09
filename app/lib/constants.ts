import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ"
);

// Devnet USDC mint
export const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export const NETWORK = "devnet";
export const RPC_URL = "https://api.devnet.solana.com";
export const DEVNET_RPC_URL = RPC_URL;

// Registry PDA — seeds: ["registry"]
export const [REGISTRY_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("registry")],
  PROGRAM_ID
);
