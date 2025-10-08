"use client";

import Modal from "@/component/ResuableModal";
import GlowingEffect from "@/component/GlowingEffectProps";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAccount } from "@micro-stacks/react";
import { useJoinGame } from "@/hooks/useGame";
import { useGameStore } from "@/store/gameStore";

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const StakeModal: React.FC<StakeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { stxAddress } = useAccount();

  const { mutateAsync: joinGameMutation } = useJoinGame();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [showManualProceed, setShowManualProceed] = useState(false);
  const isMounted = useRef(true);

  const selectedGame = useGameStore((state) => state.selectedGame);
  const setSelectedGame = useGameStore((state) => state.setSelectedGame);

  const stake = selectedGame?.stake ?? 0n;
  const gameId = selectedGame?.gameId;

  const stakeValue = typeof stake === "bigint" ? stake : BigInt(stake ?? 0);
  const stakeInSTX = Number(stakeValue) / 1_000_000;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  console.log(
    "🚀 StakeModal received stake:",
    stake?.toString(),
    "gameId:",
    gameId
  );

  const handleStake = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setTxId(null);

      if (!isSignedIn || !stxAddress) {
        setError("⚠ Please connect your Stacks wallet first");
        setIsProcessing(false);
        return;
      }

      if (!gameId) {
        setError("Game ID is missing");
        setIsProcessing(false);
        return;
      }

      const tx = await joinGameMutation({ gameId });
      console.log("Join game transaction:", tx);

      setTxId(tx.txId);

      onClose();
      setSelectedGame(null);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/GameScreen/${gameId}`);
      }
    } catch (err) {
      console.error("Stake error:", err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to stake");
        setIsProcessing(false);
      }
    }
  };

  const handleManualProceed = () => {
    onClose();
    setSelectedGame(null);
    router.push(`/GameScreen/${gameId}`);
  };

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsProcessing(false);
      setTxId(null);
      setShowManualProceed(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-[#0B1445] text-white text-center p-6 rounded-2xl">
        <GlowingEffect className="top-[63px] left-[47px]" />
        <h2 className="text-[25px] font-bold mb-4">Stake to Join</h2>

        {/* ✅ Fixed display logic */}
        <div className="bg-white text-[#0B1445] py-1 px-6 rounded-lg mb-10 inline-block font-bold">
          
          {stakeValue > 0n
            ? `${Number(stakeInSTX.toFixed(3))
                .toString()
                .replace(/\.?0+$/, "")} STX`
            : "Free Entry"}
        </div>

        {txId && (
          <p className="text-blue-400 text-xs mb-2">Transaction: {txId}</p>
        )}

        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        {!isSignedIn && (
          <p className="text-yellow-400 text-sm mb-2">
            Please connect your wallet to proceed
          </p>
        )}

        {showManualProceed && (
          <div className="mb-4 p-3 bg-yellow-900 rounded-lg">
            <p className="text-yellow-300 text-sm mb-2">
              Transaction is taking longer than expected. If it was confirmed in
              your wallet, you can proceed manually.
            </p>
            <button
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-4 rounded text-sm"
              onClick={handleManualProceed}
            >
              Proceed to Game
            </button>
          </div>
        )}

        <button
          className={`bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full w-full 
            shadow-[0_4px_0_#474d76] hover:shadow-[0_4px_0_#474d76] active:translate-y-1 transition-all mt-6
            ${isProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
          onClick={handleStake}
          disabled={isProcessing || !isSignedIn}
        >
          {isProcessing ? "Processing..." : "Proceed to STAKE"}
        </button>
      </div>
    </Modal>
  );
};

export default StakeModal;
