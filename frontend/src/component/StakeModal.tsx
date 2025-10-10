"use client";

import Modal from "@/component/ResuableModal";
import GlowingEffect from "@/component/GlowingEffectProps";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAccount } from "@micro-stacks/react";
import { useJoinGame } from "@/hooks/useGame";
import { useGameStore } from "@/store/gameStore";
import {
  showErrorToast,
  showSuccessToast,
  showTransactionToast,
} from "@/component/Toast";

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StakeModal: React.FC<StakeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { stxAddress } = useAccount();
  const { mutateAsync: joinGameMutation } = useJoinGame();
  const { selectedGame, setSelectedGame, setCurrentPlayerGame } =
    useGameStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const isMounted = useRef(true);

  const stake = selectedGame?.stake ?? 0n;
  const gameId = selectedGame?.gameId;

  const stakeValue = typeof stake === "bigint" ? stake : BigInt(stake ?? 0);
  const stakeInSTX = Number(stakeValue) / 1_000_000;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleStake = async () => {
    // Client-side validation
    if (!isSignedIn || !stxAddress) {
      showErrorToast("Please connect your Stacks wallet first", "Wallet Error");
      return;
    }

    if (!gameId) {
      showErrorToast("Game ID is missing", "Invalid Game");
      return;
    }

    setIsProcessing(true);

    try {
      // Show pending transaction toast
      showTransactionToast("pending", "pending", undefined);

      const { txId } = await joinGameMutation({
        gameId,
        stake: stakeValue,
        stxAddress,
      });

      // Show success toast with explorer link
      showTransactionToast(
        txId,
        "success",
        `https://explorer.stacks.co/txid/${txId}?chain=testnet`
      );

      setCurrentPlayerGame(selectedGame);

      showSuccessToast(`Successfully joined Game #${gameId}!`, "Game Joined");

      // Reset state before closing
      setIsProcessing(false);
      setSelectedGame(null);
      onClose();

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/GameScreen/${gameId}`);
      }
    } catch (err: any) {
      console.error("Stake error:", err);

      // Reset processing state immediately on error
      setIsProcessing(false);

      // Show error toast
      showErrorToast(
        err.message || "Failed to join game. Please try again.",
        "Join Game Error"
      );

      // Don't close modal on error, let user try again or manually close
      // If you want to close on error, uncomment the lines below:
      // setSelectedGame(null);
      // onClose();
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-gradient-to-br from-[#0B1445] via-[#0a1529] to-[#0B1445] text-white p-6 sm:p-8 rounded-2xl border border-red-500/20 max-w-md w-full">
        <GlowingEffect className="top-[63px] left-[47px]" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Join Game</h2>
          <p className="text-sm text-gray-400">Stake to enter and compete</p>
        </div>

        {/* Stake Display */}
        <div className="bg-gradient-to-r from-red-500/20 via-purple-500/20 to-red-500/20 border border-red-500/30 rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-400 mb-2 text-center">
            Required Stake
          </p>
          <div className="text-center">
            <p className="text-4xl sm:text-5xl font-bold text-[#FF3B3B] drop-shadow-lg">
              {stakeValue > 0n
                ? `${Number(stakeInSTX.toFixed(3))
                    .toString()
                    .replace(/\.?0+$/, "")} STX`
                : "Free Entry"}
            </p>
          </div>
        </div>

        {/* Game Info */}
        {selectedGame && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 mb-6 border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Game ID:</span>
              <span className="text-sm font-bold text-white">
                #{selectedGame.gameId.toString()}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-400">Players:</span>
              <span className="text-sm font-bold text-white">
                {selectedGame.players.includes(selectedGame.creator)
                  ? selectedGame.playerCount - 1
                  : selectedGame.playerCount}
                /5
              </span>
            </div>
          </div>
        )}

        {/* Wallet Warning */}
        {!isSignedIn && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
            <p className="text-sm text-yellow-300 text-center">
              Please connect your wallet to proceed
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          className={`w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/50 ${
            isProcessing || !isSignedIn
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-105"
          }`}
          onClick={handleStake}
          disabled={isProcessing || !isSignedIn}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Stake & Join Game"
          )}
        </button>
      </div>
    </Modal>
  );
};

export default StakeModal;
