"use client";

import { useState, useEffect } from "react";
import { Open_Sans } from "next/font/google";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth, useAccount } from "@micro-stacks/react";
import Modal from "@/component/ResuableModal";
import GlowingEffect from "@/component/GlowingEffectProps";
import BackgroundImgBlur from "@/component/BackgroundBlur";
import StakeModal from "@/component/StakeModal";
import GameCard from "@/component/GameCard";
import GameFilter, { FilterOptions } from "@/component/GameFilter";
import CreateGameModal from "@/component/CreateGameModal";

import { useActiveGames, useMyGames, useGameStatus } from "@/hooks/useGame";
import { GameStatus } from "@/lib/contractCalls";
import { useGameStore } from "@/store/gameStore";

// ---------- Fonts ----------
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "700"] });

// ---------- Main Page ----------
export default function HomePage() {
  const { isSignedIn } = useAuth();
  const { stxAddress } = useAccount();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateGameOpen, setIsCreateGameOpen] = useState(false);

  const {
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    activeGames,
    setActiveGames,
    myGames,
    setMyGames,
    loading: storeLoading,
  } = useGameStore();

  const { data: fetchedActiveGames = [], isLoading: isLoadingGames } =
    useActiveGames();

  const isFiltersApplied =
    filters.sortBy !== "newest" ||
    filters.sortOrder !== "desc" ||
    filters.minStake !== "0" ||
    filters.status !== GameStatus.Active;

  console.log("Fetched Active Games:", fetchedActiveGames);

  useEffect(() => {
    if (fetchedActiveGames.length > 0) {
      setActiveGames(fetchedActiveGames);
    }
  }, [fetchedActiveGames, setActiveGames]);

  // Filter active games based on store filters
  const filteredActiveGames = activeGames
    .filter((game) => {
      const stakeInStx = Number(game.stake) / 1_000_000;
      return (
        stakeInStx >= Number(filters.minStake) && game.status === filters.status
      );
    })
    .sort((a, b) => {
      // Implement sorting based on filters (placeholder; adjust as needed)
      if (filters.sortBy === "newest") {
        return filters.sortOrder === "desc" ? -1 : 1;
      }
      return 0;
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
          {/* Modals */}
          <CreateGameModal
            isOpen={isCreateGameOpen}
            onClose={() => setIsCreateGameOpen(false)}
          />

          <Modal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)}>
            <div className="bg-[#0B1445] text-white text-center p-6 rounded-2xl">
              <GlowingEffect className="top-[63px] left-[47px]" />
              <h2 className="text-[25px] font-bold mb-4">Filter Games</h2>
              <div className="bg-[#0f1c5c] p-2 rounded-xl mb-6">
                <GameFilter
                  onFilterChange={(newFilters) => {
                    setFilters({
                      sortBy: newFilters.sortBy,
                      sortOrder: newFilters.sortOrder,
                      minStake: newFilters.minStake ?? "0",
                      status: newFilters.status ?? GameStatus.Active,
                    });
                    setIsFilterOpen(false);
                  }}
                />
              </div>
            </div>
          </Modal>

          {/* Tabs & Controls */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-1 inline-flex">
              {["active", "my-games"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as "active" | "my-games")}
                  className={`px-4 sm:px-6 py-2 rounded-md transition-colors text-sm sm:text-base ${
                    activeTab === tab
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab === "active" ? "Active Games" : "My Games"}
                </button>
              ))}
            </div>

            {isSignedIn && activeTab === "active" && (
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

          {/* Game Grids */}
          {!isSignedIn ? (
            <div className="text-center py-10">
              <p className="text-gray-400 mb-4">
                Connect your wallet to create or join games.
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
              games={filteredActiveGames}
              setIsCreateGameOpen={setIsCreateGameOpen}
            />
          ) : (
            <MyGamesGrid address={stxAddress!} />
          )}
        </div>
      </div>
    </BackgroundImgBlur>
  );
}

// ---------- Active Games Grid ----------
function ActiveGamesGrid({
  games,
  setIsCreateGameOpen,
}: {
  games: any[];
  setIsCreateGameOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const selectedGame = useGameStore((state) => state.selectedGame);
  const setSelectedGame = useGameStore((state) => state.setSelectedGame);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {/* Create Game Button */}
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
        </div>
      </motion.button>

      {/* Active Games */}
      {games.map((game) => (
        <GameDataLoader key={game.gameId.toString()} game={game} />
      ))}

      {selectedGame && (
        <StakeModal
          isOpen={true}
          onClose={() => setSelectedGame(null)}
          onSuccess={() => router.push(`/GameScreen/${selectedGame.gameId}`)}
        />
      )}

      {games.length === 0 && (
        <div className="col-span-4 text-center py-10 text-gray-400">
          No active games found
        </div>
      )}
    </div>
  );
}

// ---------- My Games Grid ----------
function MyGamesGrid({ address }: { address: string }) {
  const { data: fetchedMyGames, isLoading } = useMyGames(address);
  const setMyGames = useGameStore((state) => state.setMyGames);

  useEffect(() => {
    if (fetchedMyGames) {
      setMyGames(fetchedMyGames);
    }
  }, [fetchedMyGames, setMyGames]);

  const { myGames: storeMyGames } = useGameStore();

  if (isLoading)
    return (
      <div className="text-center py-10 text-gray-400">
        Loading your games...
      </div>
    );
  if (!storeMyGames?.length)
    return (
      <div className="text-center py-10 text-gray-400">No games found.</div>
    );

  const activeGames = storeMyGames.filter(
    (g) => g.status === GameStatus.Active
  );
  const endedGames = storeMyGames.filter((g) => g.status === GameStatus.Ended);

  return (
    <div className="space-y-10">
      {activeGames.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold text-white mb-4">
            Active Games
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeGames.map((game) => (
              <GameDataLoader key={game.gameId.toString()} game={game} />
            ))}
          </div>
        </section>
      )}

      {endedGames.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold text-white mb-4">
            Completed Games
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {endedGames.map((game) => (
              <GameDataLoader key={game.gameId.toString()} game={game} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------- Game Data Loader ----------
function GameDataLoader({ game }: { game: any }) {
  const { data: fullGame, isLoading } = useGameStatus(game.gameId);

  if (isLoading || !fullGame)
    return <div className="bg-[#191F57CF] p-6 rounded-lg animate-pulse h-48" />;

  return (
    <GameCard
      gameId={fullGame.gameId}
      creator={fullGame.creator as `0x${string}`}
      stake={fullGame.stake}
      playerCount={fullGame.playerCount}
      status={fullGame.status}
    />
  );
}
