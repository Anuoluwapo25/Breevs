"use client";

import { useAccount, useAuth } from "@micro-stacks/react";
import { Open_Sans } from "next/font/google";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { connectWebSocketClient } from "@stacks/blockchain-api-client";
import {
  useGameStatus,
  useIsGameCreator,
  useStartGame,
  useSpin,
  useAdvanceRound,
  useClaimPrize,
  useIsPrizeClaimed,
} from "@/hooks/useGame";
import { GameStatus } from "@/lib/contractCalls";
import BackgroundImgBlur from "@/component/BackgroundBlur";
import Link from "next/link";

const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "700"] });
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "ST168JS95Y70CV8T7T63GF8V420FG2VCBZ5TXP2DA";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME || "Breevs-v2";

interface Player {
  name: string;
  address: string;
  status: "Still in" | "Eliminated";
}

interface WinnerAnnouncement {
  address: string;
  amount: string;
}

interface WheelOfFortuneProps {
  gameId: bigint;
}

const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ gameId }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [winners, setWinners] = useState<WinnerAnnouncement[]>([]);
  const { isSignedIn } = useAuth();
  const { stxAddress } = useAccount();

  const {
    data: game,
    isLoading: isLoadingStatus,
    isError,
    error: gameError,
    refetch,
  } = useGameStatus(gameId);
  const { data: isGameCreator } = useIsGameCreator(gameId, stxAddress || "");
  const {
    mutateAsync: startGame,
    isPending: isStarting,
    error: startError,
  } = useStartGame();
  const {
    mutateAsync: spin,
    isPending: isSpinningTx,
    error: spinError,
  } = useSpin();
  const {
    mutateAsync: advanceRound,
    isPending: isAdvancing,
    error: advanceError,
  } = useAdvanceRound();
  const {
    mutateAsync: claimPrize,
    isPending: isClaiming,
    error: claimError,
  } = useClaimPrize();
  const { data: isPrizeClaimed, error: prizeError } = useIsPrizeClaimed(
    gameId,
    stxAddress || ""
  );

  // Handle invalid gameId
  if (!gameId) {
    return (
      <BackgroundImgBlur>
        <div className="flex flex-col justify-center items-center min-h-screen text-red-400 px-4">
          <p className="text-base sm:text-lg">Invalid game ID</p>
          <Link
            href="/"
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm sm:text-base"
          >
            Back to Home
          </Link>
        </div>
      </BackgroundImgBlur>
    );
  }

  // Handle players and winner, excluding creator
  useEffect(() => {
    if (game && game.players) {
      const nonCreatorPlayers = game.players.filter(
        (address) => address !== game.creator
      );
      const formattedPlayers: Player[] = nonCreatorPlayers.map(
        (address, index) => ({
          name: `Player ${index + 1}`,
          address,
          status:
            game.winner === address && game.status === GameStatus.Ended
              ? "Eliminated"
              : "Still in",
        })
      );
      setPlayers(formattedPlayers);
      if (game.status === GameStatus.Ended && game.winner) {
        const winnerPlayer = formattedPlayers.find(
          (p) => p.address === game.winner
        );
        if (winnerPlayer) setWinner(winnerPlayer.name);
      }
    }
  }, [game]);

  // Fetch winner announcements
  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const client = await connectWebSocketClient(
          "wss://stacks-node-api.testnet.stacks.co"
        );
        client.subscribeAddressTransactions(
          `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
          (event: any) => {
            if (
              event.event_type === "contract_event" &&
              event.contract_event.event_name === "prize-claimed"
            ) {
              setWinners((prev) => [
                ...prev,
                {
                  address: event.contract_event.value.winner,
                  amount: `${(
                    Number(event.contract_event.value.amount) / 1_000_000
                  ).toFixed(4)} STX`,
                },
              ]);
            }
          }
        );
      } catch (err) {
        console.error("Failed to subscribe to winner events:", err);
      }
    };
    fetchWinners();
  }, []);

  // Winner announcements animation
  useEffect(() => {
    if (winners.length > 0) {
      const interval = setInterval(() => {
        setWinners((prev) => {
          const newWinners = [...prev];
          newWinners.push(newWinners.shift()!);
          return newWinners;
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [winners]);

  const startGameAction = async () => {
    if (!isSignedIn || !stxAddress || isStarting) return;
    setError(null);
    try {
      if (game?.status !== GameStatus.Active)
        throw new Error("Game is not waiting for players");
      const nonCreatorPlayerCount = game.players.includes(game.creator)
        ? game.playerCount - 1
        : game.playerCount;
      if (nonCreatorPlayerCount !== 5)
        throw new Error(
          "Game requires exactly 5 players to start (excluding creator)"
        );
      if (stxAddress !== game?.creator)
        throw new Error("Only the game creator can start the game");
      await startGame({ gameId });
      await refetch();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const spinWheel = async () => {
    if (isSpinning || isSpinningTx || winner || !isSignedIn || !stxAddress)
      return;
    setError(null);
    try {
      if (game?.status !== GameStatus.InProgress)
        throw new Error("Game is not in progress");
      if (game?.playerCount <= 1) throw new Error("Not enough players to spin");
      if (stxAddress !== game?.creator)
        throw new Error("Only the game creator can spin");
      if (game?.roundEnd && Date.now() > Number(game.roundEnd) * 10_000) {
        throw new Error("Round has expired, please advance to the next round");
      }

      setIsSpinning(true);
      const result = await spin({ gameId });
      const eliminatedPlayer: string = result.spinTX.value;
      const remainingPlayers = players.filter((p) => p.status === "Still in");
      const eliminatedIndex = remainingPlayers.findIndex(
        (p) => p.address === eliminatedPlayer
      );
      if (eliminatedIndex === -1)
        throw new Error("Eliminated player not found");

      const anglePerSegment = 360 / remainingPlayers.length;
      const targetAngle = eliminatedIndex * anglePerSegment;
      const totalSpins = 5 + Math.random() * 3;
      const finalAngle = 360 * totalSpins + targetAngle;

      let currentRotation = rotation;
      const accelerationDuration = 1000;
      const accelerationSteps = 30;
      const accelerationStep = accelerationDuration / accelerationSteps;
      let stepCount = 0;

      const accelerate = setInterval(() => {
        stepCount++;
        const progress = stepCount / accelerationSteps;
        const easedProgress = progress * progress * (3 - 2 * progress);
        currentRotation += easedProgress * 30;
        setRotation(currentRotation);
        if (stepCount >= accelerationSteps) {
          clearInterval(accelerate);
          const constantDuration = 3000;
          const constantSteps = 60;
          const constantStep = constantDuration / constantSteps;
          let constantStepCount = 0;

          const constantSpin = setInterval(() => {
            constantStepCount++;
            currentRotation += 30;
            setRotation(currentRotation);
            if (constantStepCount >= constantSteps) {
              clearInterval(constantSpin);
              const decelerationDuration = 2000;
              const decelerationSteps = 40;
              const decelerationStep = decelerationDuration / decelerationSteps;
              let decelerationStepCount = 0;

              const decelerate = setInterval(() => {
                decelerationStepCount++;
                const progress = decelerationStepCount / decelerationSteps;
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                const remainingAngle = finalAngle - currentRotation;
                currentRotation +=
                  (remainingAngle /
                    (decelerationSteps - decelerationStepCount + 1)) *
                  easedProgress;
                setRotation(currentRotation);
                if (decelerationStepCount >= decelerationSteps) {
                  clearInterval(decelerate);
                  setRotation(finalAngle);
                  setIsSpinning(false);
                  refetch();
                }
              }, decelerationStep);
            }
          }, constantStep);
        }
      }, accelerationStep);
    } catch (err: any) {
      setError(err.message);
      setIsSpinning(false);
    }
  };

  const advanceRoundAction = async () => {
    if (!isSignedIn || !stxAddress || isAdvancing || winner) return;
    setError(null);
    try {
      if (game?.status !== GameStatus.InProgress)
        throw new Error("Game is not in progress");
      if (stxAddress !== game?.creator)
        throw new Error("Only the game creator can advance the round");
      if (game?.roundEnd && Date.now() < Number(game.roundEnd) * 10_000) {
        throw new Error("Round duration has not expired");
      }
      await advanceRound({ gameId });
      await refetch();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const claimPrizeAction = async () => {
    if (!isSignedIn || !stxAddress || isClaiming || !winner) return;
    setError(null);
    try {
      if (game?.status !== GameStatus.Ended)
        throw new Error("Game has not ended");
      if (stxAddress !== game?.winner)
        throw new Error("Only the winner can claim the prize");
      if (isPrizeClaimed) throw new Error("Prize already claimed");
      await claimPrize({ gameId });
      await refetch();
      setWinners((prev) => [
        ...prev,
        {
          address: stxAddress,
          amount: `${(Number(game?.prizePool) / 1_000_000).toFixed(4)} STX`,
        },
      ]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getGameStatusText = () => {
    if (!game || isLoadingStatus) return "Loading...";
    switch (game.status) {
      case GameStatus.Active:
        return "Waiting for Players";
      case GameStatus.InProgress:
        return `In Progress (Round ${game.currentRound})`;
      case GameStatus.Ended:
        return "Game Ended";
      default:
        return "Unknown";
    }
  };

  const canStartGame = () => {
    if (!game || !isSignedIn || !stxAddress || !game.creator) return false;
    const nonCreatorPlayerCount = game.players.includes(game.creator)
      ? game.playerCount - 1
      : game.playerCount;
    return (
      game.status === GameStatus.Active &&
      nonCreatorPlayerCount === 5 &&
      stxAddress === game.creator
    );
  };

  const canSpin = () =>
    game?.status === GameStatus.InProgress &&
    game?.playerCount > 1 &&
    isSignedIn &&
    stxAddress === game?.creator &&
    !isSpinning &&
    !isSpinningTx &&
    game?.roundEnd &&
    Date.now() <= Number(game.roundEnd) * 10_000;

  const canAdvanceRound = () =>
    game?.status === GameStatus.InProgress &&
    isSignedIn &&
    stxAddress === game?.creator &&
    game?.roundEnd &&
    Date.now() >= Number(game.roundEnd) * 10_000 &&
    !isAdvancing;

  const canClaimPrize = () =>
    game?.status === GameStatus.Ended &&
    isSignedIn &&
    stxAddress === game?.winner &&
    !isClaiming &&
    !isPrizeClaimed;

  if (isLoadingStatus || isError) {
    return (
      <BackgroundImgBlur>
        <div className="flex flex-col justify-center items-center min-h-screen text-white px-4">
          {isLoadingStatus && (
            <div className="text-lg sm:text-xl animate-pulse">
              Loading game...
            </div>
          )}
          {isError && (
            <>
              <p className="text-red-400 text-sm sm:text-base text-center">
                Error: {gameError?.message || "Failed to load game"}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm sm:text-base"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </BackgroundImgBlur>
    );
  }

  if (!stxAddress) {
    return (
      <BackgroundImgBlur>
        <div className="flex flex-col justify-center items-center min-h-screen text-white px-4">
          <p className="text-yellow-300 text-sm sm:text-base text-center">
            Please connect your wallet to view the game
          </p>
        </div>
      </BackgroundImgBlur>
    );
  }

  const adjustedPlayerCount =
    game && game.creator
      ? game.players.includes(game.creator)
        ? game.playerCount - 1
        : game.playerCount
      : 0;

  return (
    <BackgroundImgBlur>
      <div
        className={`${openSans.className} w-full h-screen overflow-hidden flex flex-col`}
      >
        {/* Fixed Header */}
        <div className="w-full bg-gradient-to-r from-[#030b1f] via-[#0a1529] to-[#030b1f] border-b border-red-500/20 py-3 px-4 sm:px-6 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-center sm:text-left">
              <h1 className="text-xl text-white sm:text-2xl lg:text-3xl font-bold">
                <span className="text-[#FF3B3B]">WIN</span> or LOSE
              </h1>
              <p className="text-xs sm:text-sm text-gray-300">
                Last man standing{" "}
                <span className="text-[#FF3B3B] font-bold">WINS BIG!</span>
              </p>
            </div>

            {winners.length > 0 && (
              <motion.div
                key={winners[0].address}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-r from-purple-900/40 to-red-900/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-red-500/30"
              >
                <p className="text-xs text-gray-400">Latest Winner</p>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-white font-mono">
                    {winners[0].address.slice(0, 6)}...
                    {winners[0].address.slice(-4)}
                  </span>
                  <span className="text-gray-400">won</span>
                  <span className="text-[#FF3B3B] font-bold">
                    {winners[0].amount}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Main Content - Fixed Height with Scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              {/* Left Panel - Game Info */}
              <div className="lg:col-span-4 xl:col-span-3">
                <div className="bg-gradient-to-br from-[#030b1f]/95 to-[#0a1529]/95 backdrop-blur-md rounded-xl border border-red-500/20 p-4 shadow-xl sticky top-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Game #{gameId.toString()}
                    </h2>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        game?.status === GameStatus.Active
                          ? "bg-yellow-500/20 text-yellow-400"
                          : game?.status === GameStatus.InProgress
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {getGameStatusText()}
                    </span>
                  </div>

                  {isGameCreator && (
                    <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <p className="text-xs text-purple-300 font-semibold">
                        🎮 You are the Game Host
                      </p>
                    </div>
                  )}

                  {game?.status === GameStatus.InProgress && game.roundEnd && (
                    <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-gray-400">Time Left</p>
                      <p className="text-xl font-bold text-blue-400">
                        {Math.max(
                          0,
                          Math.floor(
                            (Number(game.roundEnd) * 10_000 - Date.now()) / 1000
                          )
                        )}
                        s
                      </p>
                    </div>
                  )}

                  {game && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                        <p className="text-xs text-gray-400">Stake</p>
                        <p className="text-sm font-bold text-white">
                          {(Number(game.stake) / 1_000_000).toFixed(4)} STX
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                        <p className="text-xs text-gray-400">Players</p>
                        <p className="text-sm font-bold text-white">
                          {adjustedPlayerCount}/5
                        </p>
                      </div>
                      <div className="col-span-2 bg-gradient-to-r from-[#FF3B3B]/20 to-purple-500/20 rounded-lg p-2 border border-[#FF3B3B]/30">
                        <p className="text-xs text-gray-400">Prize Pool</p>
                        <p className="text-lg sm:text-xl font-bold text-[#FF3B3B]">
                          {(Number(game.prizePool) / 1_000_000).toFixed(4)} STX
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error Messages */}
                  {(error ||
                    startError ||
                    spinError ||
                    advanceError ||
                    claimError ||
                    prizeError) && (
                    <div className="mb-3 p-2 bg-red-900/30 border border-red-500/50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <p className="text-xs text-red-300 flex-1">
                          {error ||
                            startError?.message ||
                            spinError?.message ||
                            advanceError?.message ||
                            claimError?.message ||
                            prizeError?.message}
                        </p>
                        <button
                          onClick={() => setError(null)}
                          className="ml-2 text-red-400 hover:text-red-300"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}

                  {!isSignedIn && (
                    <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                      <p className="text-xs text-yellow-300">
                        Connect wallet to interact
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {game?.status === GameStatus.Active &&
                      isSignedIn &&
                      stxAddress &&
                      !game.players.includes(stxAddress) &&
                      adjustedPlayerCount < 5 && (
                        <Link
                          href="/"
                          className="block w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold py-2 px-4 rounded-lg text-center transition-all text-sm shadow-lg"
                        >
                          Join Game
                        </Link>
                      )}

                    {canStartGame() && (
                      <button
                        onClick={startGameAction}
                        disabled={isStarting}
                        className={`w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-lg ${
                          isStarting ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {isStarting ? "Starting..." : "🎮 Start Game"}
                      </button>
                    )}

                    {canSpin() && (
                      <button
                        onClick={spinWheel}
                        disabled={isSpinning || isSpinningTx}
                        className={`w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-lg ${
                          isSpinning || isSpinningTx
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isSpinning || isSpinningTx
                          ? "🎡 Spinning..."
                          : "🎡 Spin Wheel"}
                      </button>
                    )}

                    {canAdvanceRound() && (
                      <button
                        onClick={advanceRoundAction}
                        disabled={isAdvancing}
                        className={`w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-lg ${
                          isAdvancing ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {isAdvancing ? "Advancing..." : "⏭️ Advance Round"}
                      </button>
                    )}

                    {canClaimPrize() && (
                      <button
                        onClick={claimPrizeAction}
                        disabled={isClaiming || isPrizeClaimed}
                        className={`w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-lg ${
                          isClaiming || isPrizeClaimed
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isClaiming ? "Claiming..." : "🏆 Claim Prize"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Center Panel - Fixed Wheel */}
              <div className="lg:col-span-4 xl:col-span-5 flex items-center justify-center">
                <div className="relative w-full max-w-sm aspect-square sticky top-4">
                  <motion.div
                    className={`w-full h-full rounded-full border-8 border-red-500 flex items-center justify-center shadow-2xl ${
                      isSpinning || isSpinningTx ? "pointer-events-none" : ""
                    }`}
                    animate={{ rotate: rotation }}
                    transition={{
                      ease: "easeOut",
                      duration: isSpinning ? 0 : 0.1,
                    }}
                    style={{
                      filter: isSpinning ? "blur(3px)" : "none",
                      background:
                        "radial-gradient(circle, rgba(255,59,59,0.1) 0%, rgba(3,11,31,0.9) 70%)",
                    }}
                  >
                    <div
                      className={`absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-bold text-base sm:text-lg shadow-2xl z-10 cursor-pointer transition-all ${
                        canSpin()
                          ? "bg-white text-black hover:bg-gray-200 hover:scale-110"
                          : "bg-gray-600 text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={spinWheel}
                    >
                      {isSpinning || isSpinningTx ? "..." : "SPIN"}
                    </div>
                    <div className="absolute w-full h-full flex flex-col items-center justify-center">
                      {players
                        .filter((p) => p.status === "Still in")
                        .map((player, index) => (
                          <div
                            key={index}
                            className="absolute w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full font-semibold text-xs bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg border-2 border-white/30"
                            style={{
                              transform: `rotate(${
                                index *
                                (360 /
                                  players.filter((p) => p.status === "Still in")
                                    .length)
                              }deg) translateY(-95px) rotate(-${
                                index *
                                (360 /
                                  players.filter((p) => p.status === "Still in")
                                    .length)
                              }deg)`,
                            }}
                          >
                            {player.name}
                          </div>
                        ))}
                    </div>
                  </motion.div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                    <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-l-transparent border-r-transparent border-t-[28px] border-t-white drop-shadow-lg"></div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Players List */}
              <div className="lg:col-span-4">
                <div className="bg-gradient-to-br from-[#030b1f]/95 to-[#0a1529]/95 backdrop-blur-md rounded-xl border border-red-500/20 p-4 shadow-xl sticky top-4">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3">
                    👥 Participants
                  </h3>

                  {/* Creator */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-2">Host</p>
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                      <p className="text-xs sm:text-sm text-white font-mono">
                        {game?.creator.slice(0, 8)}...{game?.creator.slice(-6)}
                      </p>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-2">Players</p>
                    {players.map((player, index) => (
                      <div
                        key={index}
                        className={`bg-white/5 border rounded-lg p-2 transition-all ${
                          player.status === "Eliminated"
                            ? "border-red-500/30 opacity-50"
                            : "border-green-500/30"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p
                              className={`text-xs sm:text-sm font-semibold ${
                                player.status === "Eliminated"
                                  ? "line-through text-gray-500"
                                  : "text-white"
                              }`}
                            >
                              {player.name}
                            </p>
                            <p className="text-xs text-gray-400 font-mono mt-1">
                              {player.address.slice(0, 6)}...
                              {player.address.slice(-4)}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              player.status === "Still in"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {player.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {winner && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/50 rounded-lg">
                      <h3 className="text-base font-bold text-green-300 mb-1">
                        🎉 Winner!
                      </h3>
                      <p className="text-sm text-green-200">
                        {winner} wins the entire pot!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundImgBlur>
  );
};

export default WheelOfFortune;
