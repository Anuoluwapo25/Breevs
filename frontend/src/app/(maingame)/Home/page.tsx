"use client";

import { useState, useEffect } from "react";
import { Open_Sans } from "next/font/google";
import Image from "next/image";
import Logo from "@/assets/RR_LOGO_1.png";
import { formatEther } from "viem";
import { useRouter } from "next/navigation";
import StakeModal from "@/component/StakeModal";
import BackgroundImgBlur from "@/component/BackgroundBlur";
import { useAccount, usePublicClient } from "wagmi";
import {
  useActiveGames,
  useGameStatus,
  GameStatus,
  getGameStatus,
} from "@/hooks/useGame";
import Link from "next/link";
import { motion } from "framer-motion";
import GameCard from "@/component/GameCard";
import GameFilter, { FilterOptions } from "@/component/GameFilter";
import CreateGameModal from "@/component/CreateGameModal";
import Modal from "@/component/ResuableModal";
import GlowingEffect from "@/component/GlowingEffectProps";

const stakes = [
  { amount: "1 CORE" },
  { amount: "0.1 CORE" },
  { amount: "1.12 CORE" },
  { amount: "2 CORE" },
  { amount: "0.5 CORE" },
  { amount: "3 CORE" },
  { amount: "5 CORE" },
  { amount: "0.8 CORE" },
  { amount: "1.5 CORE" },
  { amount: "2.5 CORE" },
  { amount: "4 CORE" },
  { amount: "6 CORE" },
  { amount: "7 CORE" },
  { amount: "8 CORE" },
];

const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "700"] });

export default function HomePage() {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<"active" | "my-games">("active");
  const { data: activeGameIds = [], isLoading: isLoadingGames } =
    useActiveGames();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateGameOpen, setIsCreateGameOpen] = useState(false);
  const [isFiltersApplied, setIsFiltersApplied] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: "newest",
    sortOrder: "desc",
    minStake: "0",
    status: GameStatus.Active,
  });

  return (
    <BackgroundImgBlur>
      <div className={`${openSans.className} relative w-full min-h-screen`}>
        {/* Header Section */}
        <div className="fixed top-0 rounded-lg z-50 left-1/2 transform -translate-x-1/2 mt-2 py-3 px-4 sm:px-8 transition-all duration-300 bg-[#030b1f] w-[95%] sm:w-auto">
          <h2 className="text-white text-xl sm:text-2xl mb-1 font-bold text-center">
            Welcome to <span className="text-red-500">Breevs</span>
          </h2>
          <p className="text-sm text-white text-center">
            Join the ultimate game of chance and strategy to
            <span className="text-red-500"> WIN BIG!!!</span>
          </p>
        </div>

        {/* Main Content */}
        <div className="pt-32 sm:pt-28 w-full max-w-screen-xl mx-auto px-4 pb-20">
          {/* Create Game Modal */}
          <CreateGameModal
            isOpen={isCreateGameOpen}
            onClose={() => setIsCreateGameOpen(false)}
          />

          {/* Game Controls Container */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
            {/* Tabs */}
            <div className="bg-gray-800 rounded-lg p-1 inline-flex">
              <button
                className={`px-4 sm:px-6 py-2 rounded-md transition-colors text-sm sm:text-base ${
                  activeTab === "active"
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("active")}
              >
                Active Games
              </button>
              <button
                className={`px-4 sm:px-6 py-2 rounded-md transition-colors text-sm sm:text-base ${
                  activeTab === "my-games"
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("my-games")}
              >
                My Games
              </button>
            </div>

            {/* Filter Button */}
            {isConnected && activeTab === "active" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsFilterOpen(true)}
                className="bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 text-sm sm:text-base"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                    clipRule="evenodd"
                  />
                </svg>
                Filter Games
                {isFiltersApplied && (
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                )}
              </motion.button>
            )}
          </div>

          {/* Filter Modal */}
          <Modal
            isOpen={isFilterOpen}
            onClose={() => {
              setIsFilterOpen(false);
            }}
          >
            <div className="bg-[#0B1445] text-white text-center p-6 rounded-2xl">
              <GlowingEffect className="top-[63px] left-[47px]" />
              <h2 className="text-[25px] font-bold mb-4">Filter Games</h2>

              <div className="bg-[#0f1c5c] p-2 rounded-xl mb-6">
                <GameFilter
                  onFilterChange={(newFilters) => {
                    setFilters(newFilters);
                    setIsFilterOpen(false);
                    setIsFiltersApplied(true);
                  }}
                />
              </div>
            </div>
          </Modal>

          {/* Games Grid */}
          {!isConnected ? (
            <div className="text-center py-10">
              <p className="text-gray-400 mb-4">
                Connect your wallet to Create games and see available games
              </p>
            </div>
          ) : isLoadingGames ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-[#191F57CF] p-6 rounded-lg animate-pulse h-48"
                />
              ))}
            </div>
          ) : activeTab === "active" ? (
            <ActiveGamesGrid
              gameIds={activeGameIds || []}
              filters={filters}
              setIsCreateGameOpen={setIsCreateGameOpen}
            />
          ) : (
            <MyGamesGrid address={address!} />
          )}
        </div>
      </div>
    </BackgroundImgBlur>
  );
}

// All active games grid
function ActiveGamesGrid({
  gameIds,
  filters,
  setIsCreateGameOpen,
}: {
  gameIds: bigint[];
  filters: FilterOptions;
  setIsCreateGameOpen: (open: boolean) => void;
}) {
  const [filteredStakes, setFilteredStakes] = useState(stakes);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [selectedStakeAmount, setSelectedStakeAmount] = useState<bigint | null>(
    null
  );
  const router = useRouter();

  // Apply filters to stakes
  useEffect(() => {
    let filtered = [...stakes];

    // Apply min stake filter
    if (filters.minStake) {
      filtered = filtered.filter((stake) => {
        const stakeValue = parseFloat(stake.amount.replace(" CORE", ""));
        return stakeValue >= parseFloat(filters.minStake || "0");
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const order = filters.sortOrder === "asc" ? 1 : -1;
      if (filters.sortBy === "newest") {
        const stakeA = parseFloat(a.amount.replace(" CORE", ""));
        const stakeB = parseFloat(b.amount.replace(" CORE", ""));
        return order * (stakeB - stakeA);
      }
      return 0;
    });

    setFilteredStakes(filtered);
  }, [filters]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {/* Create Game Card */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsCreateGameOpen(true)}
        className="w-full border-2 border-dashed border-red-500/50 text-white rounded-xl hover:border-red-500 transition-all duration-300 flex flex-col items-center relative group aspect-[4/3] p-3 md:p-6"
      >
        <div className="flex flex-col items-center justify-center h-full gap-2 md:gap-4 relative">
          <div className="p-2 md:p-3 rounded-full border-2 border-dashed border-red-500/50 group-hover:border-red-500 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 md:h-8 md:w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <span className="text-sm md:text-lg font-bold text-center leading-tight">
            Create Game
          </span>
          <span className="text-xs md:text-sm text-gray-400 group-hover:text-red-400 transition-colors hidden md:block">
            Start your own game room
          </span>
        </div>
      </motion.button>

      {/* Game Cards */}
      {filteredStakes.map((stake, index) => {
        const stakeAmountStr = stake.amount.replace(" CORE", "");
        const stakeAmountBigInt = BigInt(
          Math.floor(parseFloat(stakeAmountStr) * 1e18)
        );

        return (
          <GameCard
            key={index}
            gameId={BigInt(index)}
            creator={
              "0x1234567890123456789012345678901234567890" as `0x${string}`
            }
            stakeAmount={stakeAmountBigInt}
            playerCount={2}
            status={GameStatus.Active}
            onGameSelect={(amount) => {
              setSelectedStakeAmount(amount);
              setIsStakeModalOpen(true);
            }}
          />
        );
      })}

      {selectedStakeAmount && (
        <StakeModal
          isOpen={isStakeModalOpen}
          onClose={() => {
            setIsStakeModalOpen(false);
            setSelectedStakeAmount(null);
          }}
          stakeAmount={`${formatEther(selectedStakeAmount)} CORE`}
          onSuccess={() => {
            // In real implementation, this would be the actual game ID
            router.push(`/GameScreen/1`);
          }}
        />
      )}

      {filteredStakes.length === 0 && (
        <div className="col-span-2 md:col-span-3 lg:col-span-4 text-center py-10">
          <p className="text-gray-400">
            No active games match your current filters
          </p>
        </div>
      )}
    </div>
  );
}

// User's Games grid
function MyGamesGrid({ address }: { address: `0x${string}` }) {
  const [userGames, setUserGames] = useState<{
    active: bigint[];
    completed: bigint[];
  }>({ active: [], completed: [] });

  useEffect(() => {
    const fetchUserGames = async () => {
      // Here you would add the logic to fetch both active and completed games
      // This is a placeholder that you would replace with actual contract calls
      const active: bigint[] = [];
      const completed: bigint[] = [];
      // Add logic to fetch games where the user is either creator or player
      setUserGames({ active, completed });
    };

    if (address) {
      fetchUserGames();
    }
  }, [address]);

  if (!userGames.active.length && !userGames.completed.length) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400">
          You haven't participated in any games yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {userGames.active.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            Active Games
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userGames.active.map((gameId) => (
              <GameDataLoader key={gameId.toString()} gameId={gameId} />
            ))}
          </div>
        </div>
      )}

      {userGames.completed.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            Completed Games
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userGames.completed.map((gameId) => (
              <GameDataLoader key={gameId.toString()} gameId={gameId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GameDataLoader({ gameId }: { gameId: bigint }) {
  const { data: gameStatus, isLoading } = useGameStatus(gameId);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [selectedStakeAmount, setSelectedStakeAmount] = useState<bigint | null>(
    null
  );
  const router = useRouter();

  if (isLoading || !gameStatus) {
    return <div className="bg-[#191F57CF] p-6 rounded-lg animate-pulse h-48" />;
  }

  const typedGameStatus = gameStatus as {
    creator: `0x${string}`;
    stakeAmount: bigint;
    playerCount: number;
    status: GameStatus;
  };

  const handleGameSelect = (stakeAmount: bigint) => {
    setSelectedStakeAmount(stakeAmount);
    setIsStakeModalOpen(true);
  };

  return (
    <>
      <GameCard
        gameId={gameId}
        creator={typedGameStatus.creator}
        stakeAmount={typedGameStatus.stakeAmount}
        playerCount={typedGameStatus.playerCount}
        status={typedGameStatus.status}
        onGameSelect={handleGameSelect}
      />
      {selectedStakeAmount && (
        <StakeModal
          isOpen={isStakeModalOpen}
          onClose={() => {
            setIsStakeModalOpen(false);
            setSelectedStakeAmount(null);
          }}
          stakeAmount={`${formatEther(selectedStakeAmount)} CORE`}
          onSuccess={() => {
            router.push(`/GameScreen/${gameId}`);
          }}
        />
      )}
    </>
  );
}
