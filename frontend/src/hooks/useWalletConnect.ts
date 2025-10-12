import { useAuth } from "@micro-stacks/react";
import { useCallback } from "react";
import { isSafariMobile } from "@/utils/isSafariMobile";
import { WALLET_LINKS } from "@/utils/walletLinks";

export function useWalletConnect() {
  const { openAuthRequest } = useAuth();

  const connectWallet = useCallback(
    async (wallet: "xverse" | "hiro" | "leather" = "xverse") => {
      try {
        if (isSafariMobile()) {
          window.location.href = WALLET_LINKS[wallet];
          return;
        }

        await openAuthRequest();
      } catch (err) {
        console.error("Wallet connect error:", err);
        alert(
          "⚠️ No Stacks wallet found. Please install Hiro or Xverse to continue."
        );
      }
    },
    [openAuthRequest]
  );

  return { connectWallet };
}
