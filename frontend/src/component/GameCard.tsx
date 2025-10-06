"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Logo from "@/assets/RR_LOGO_1.png";
import { GameStatus } from "@/lib/contractCalls";
import { motion } from "framer-motion";

interface GameCardProps {
  gameId: bigint;
  creator: `0x${string}`;
  stakeAmount: bigint;
  playerCount: number;
  status: GameStatus;
  isUserGame?: boolean;
  onGameSelect?: (gameId: bigint, stakeAmount: bigint) => void; 
  error?: string;
  clearError?: () => void;
}

export default function GameCard({
  gameId,
  creator,
  stakeAmount,
  playerCount,
  status,
  isUserGame,
  onGameSelect,
  error,
  clearError,
}: GameCardProps) {
  const router = useRouter();

  const handleAction = () => {
    if (status === GameStatus.Active && !isUserGame && onGameSelect) {
      // Notify parent to open StakeModal
      onGameSelect(gameId, stakeAmount);
    } else {
      // Direct navigation for ended games or user's own games
      router.push(`/GameScreen/${gameId}`);
    }
  };

  const stakeInSTX = Number(stakeAmount) / 1_000_000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleAction}
      className="bg-[#191F57CF] p-4 sm:p-5 border border-gray-700 rounded-xl shadow-lg hover:shadow-red-500/20 transition-all duration-300 cursor-pointer w-full"
    >
      <div className="flex flex-col h-full justify-between gap-3 sm:gap-4">
        {/* Creator + Status */}
        <div className="flex justify-between items-center gap-2">
          <div className="text-white min-w-0">
            <p className="text-[10px] sm:text-xs text-gray-400">Created by</p>
            <p className="text-xs font-semibold sm:hidden">
              {creator.slice(0, 3)}...{creator.slice(-3)}
            </p>
            <p className="hidden sm:block text-sm font-semibold">
              {creator.slice(0, 6)}...{creator.slice(-4)}
            </p>
          </div>

          <div className="flex-shrink-0 bg-green-500/20 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center justify-center">
            <span className="text-green-400 text-[9px] sm:text-xs truncate max-w-[60px] sm:max-w-[100px]">
              {status === GameStatus.Active ? "In Progress" : "Ended"}
            </span>
          </div>
        </div>

        {/* Game Logo */}
        <div className="flex justify-center">
          <Image
            src={Logo}
            alt="Game Icon"
            className="hidden sm:block w-20 sm:w-28 md:w-32 h-auto"
          />
        </div>

        {/* Stake Info */}
        <div className="text-center py-1 sm:py-2">
          <p className="text-xs sm:text-sm text-white font-semibold">
            Stake and Win
          </p>
          <p className="text-lg sm:text-2xl font-bold text-red-500">
            {stakeInSTX.toFixed(3).replace(/\.?0+$/, "")} STX
          </p>
        </div>

        {/* Players + Timer */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] sm:text-sm">
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3">
              <p className="text-gray-400">Players</p>
              <p className="text-white font-bold">{playerCount}/5</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3">
              <p className="text-gray-400">Time Left</p>
              <p className="text-white font-bold">5:00</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && clearError && (
          <div className="mt-2 p-2 bg-red-900/50 rounded text-xs sm:text-sm text-red-400">
            {error}
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearError();
              }}
              className="ml-2 text-red-300 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
