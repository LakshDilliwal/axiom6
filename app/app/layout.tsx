"use client";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { Toaster } from "react-hot-toast";
import { DEVNET_RPC_URL } from "../lib/constants";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Navbar } from "../components/Navbar";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-[#0a0a0a] text-white min-h-screen selection:bg-[#01696f]/30 selection:text-white">
        <ConnectionProvider endpoint={DEVNET_RPC_URL}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <Navbar />
              <div className="pt-14">
                {children}
              </div>
              <Toaster position="bottom-right" toastOptions={{
                style: { background: "#111", color: "#fff", border: "1px solid #1f1f1f", fontFamily: "var(--font-geist-sans)" }
              }} />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}
