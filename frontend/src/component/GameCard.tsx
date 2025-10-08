"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Logo from "@/assets/RR_LOGO_1.png";
import { GameStatus } from "@/lib/contractCalls";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";

interface GameCardProps {
  gameId: bigint;
  creator: string;
  stake: bigint;
  playerCount: number;
  status: GameStatus | number;
  isUserGame?: boolean;
  error?: string;
  clearError?: () => void;
}

export default function GameCard({
  gameId,
  creator,
  stake,
  playerCount,
  status,
  isUserGame,
  error,
  clearError,
}: GameCardProps) {
  const router = useRouter();
  const setSelectedGame = useGameStore((state) => state.setSelectedGame);

  const handleAction = () => {
    if (status === GameStatus.Active && !isUserGame) {
      
      setSelectedGame({ gameId, creator, stake, playerCount, status } as any);
    } else {
      router.push(`/GameScreen/${gameId}`);
    }
  };

  const stakeValue = typeof stake === "bigint" ? stake : BigInt(stake ?? 0);
  const stakeInSTX = Number(stakeValue) / 1_000_000;

  const shortCreator =
    creator && creator.startsWith("ST")
      ? `${creator.slice(0, 6)}...${creator.slice(-4)}`
      : "Unknown";

  const getStatusLabel = (s: GameStatus | number) => {
    switch (s) {
      case GameStatus.Active:
        return "In Progress";
      case GameStatus.InProgress:
        return "Pending";
      case GameStatus.Ended:
        return "Ended";
      default:
        return "Unknown";
    }
  };

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
            <p className="text-xs sm:text-sm font-semibold truncate max-w-[120px]">
              {shortCreator}
            </p>
          </div>

          <div
            className={`flex-shrink-0 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center justify-center ${
              status === GameStatus.Active
                ? "bg-green-500/20 text-green-400"
                : status === GameStatus.Ended
                ? "bg-red-500/20 text-red-400"
                : "bg-gray-500/20 text-gray-300"
            }`}
          >
            <span className="text-[9px] sm:text-xs truncate max-w-[60px] sm:max-w-[100px]">
              {getStatusLabel(status)}
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
            {stakeValue > 0n
              ? `${Number(stakeInSTX.toFixed(3))
                  .toString()
                  .replace(/\.?0+$/, "")} STX`
              : "Free Entry"}
          </p>
        </div>

        {/* Players + Timer */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] sm:text-sm">
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3">
              <p className="text-gray-400">Players</p>
              <p className="text-white font-bold">{playerCount}/6</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3">
              <p className="text-gray-400">Game ID</p>
              <p className="text-white font-bold">#{gameId.toString()}</p>
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
