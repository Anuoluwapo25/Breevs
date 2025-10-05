"use client";

import BackgroundImgBlur from "@/component/BackgroundBlur";
import React, { useState, useEffect } from "react";
import { Open_Sans } from "next/font/google";
import { motion } from "framer-motion";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { GameContract } from "@/component/index";

const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "700"] });

// Mock data for winner announcements (you can replace with real data from events)
const addresses = [
  "0xA1b2C3d4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
  "0xB2c3D4e5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T1A",
  "0xC3d4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T1A2B",
  "0xD4e5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T1A2B3C",
  "0xE5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T1A2B3C4D",
];

const winnings = ["122 CORE", "250 CORE", "75 CORE", "300 CORE", "150 CORE"];

interface Player {
  name: string;
  address: string;
  status: "Still in" | "Eliminated";
}

interface WheelOfFortuneProps {
  gameId?: number;
}

const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ gameId = 0 }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [index, setIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spinTxHash, setSpinTxHash] = useState<`0x${string}` | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read game data from contract
  const { data: gameStatusRaw, refetch: refetchGameStatus } = useReadContract({
    address: GameContract.address as `0x${string}`,
    abi: GameContract.abi,
    functionName: "getGameStatus",
    args: [BigInt(gameId)],
  });

  const gameStatus = gameStatusRaw as [bigint, bigint, number] | undefined;

  const { data: gamePlayers, refetch: refetchPlayers } = useReadContract({
    address: GameContract.address as `0x${string}`,
    abi: GameContract.abi,
    functionName: "getPlayers",
    args: [BigInt(gameId)],
  });

  // Wait for spin transaction
  const { isLoading: isSpinPending, isSuccess: isSpinSuccess } =
    useWaitForTransactionReceipt({
      hash: spinTxHash as `0x${string}`,
    });

  // Update spinning state based on transaction
  useEffect(() => {
    if (isSpinPending) {
      setIsSpinning(true);
    } else if (isSpinSuccess) {
      setIsSpinning(false);
      refetchPlayers();
      refetchGameStatus();
      setSpinTxHash(null);
    }
  }, [isSpinPending, isSpinSuccess, refetchPlayers, refetchGameStatus]);

  // Convert contract players to UI format
  useEffect(() => {
    if (gamePlayers && Array.isArray(gamePlayers)) {
      const formattedPlayers: Player[] = gamePlayers.map(
        (playerAddress: string, index: number) => ({
          name: `Player ${index + 1}`,
          address: playerAddress,
          status: "Still in" as const,
        })
      );

      setPlayers(formattedPlayers);

      // Check if game has ended (only 1 player left)
      if (
        formattedPlayers.length === 1 &&
        gameStatus &&
        Array.isArray(gameStatus) &&
        gameStatus[2] === 2
      ) {
        setWinner(formattedPlayers[0].name);
      }
    }
  }, [gamePlayers, gameStatus]);

  // Winner announcements animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % addresses.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const spinWheel = async () => {
    if (isSpinning || winner || !isConnected) return;

    setError(null);

    try {
      // Check if game is in progress
      if (!gameStatus || !Array.isArray(gameStatus) || gameStatus[2] !== 1) {
        setError("Game is not in progress");
        return;
      }

      // Check if enough players
      if (players.length <= 1) {
        setError("Not enough players to spin");
        return;
      }

      console.log("Spinning roulette for game:", gameId);

      // Start visual spinning immediately
      setIsSpinning(true);

      // Visual spinning effect
      const remainingPlayers = players.filter((p) => p.status === "Still in");
      const randomIndex = Math.floor(Math.random() * remainingPlayers.length);
      const anglePerSegment = 360 / remainingPlayers.length;
      const additionalRotation = 360 * 10 + randomIndex * anglePerSegment;

      const fastSpin = setInterval(() => {
        setRotation((prev) => prev + (Math.random() > 0.5 ? 60 : -60));
      }, 30);

      setTimeout(() => {
        clearInterval(fastSpin);
        const slowSpin = setInterval(() => {
          setRotation((prev) => prev + 10);
        }, 100);

        setTimeout(() => {
          clearInterval(slowSpin);
          setRotation((prev) => prev + additionalRotation);
        }, 3000);
      }, 2000);

      // Call smart contract function
      const hash = await writeContractAsync({
        address: GameContract.address as `0x${string}`,
        abi: GameContract.abi,
        functionName: "spinRoulette",
        args: [BigInt(gameId)],
      });

      console.log("Spin transaction submitted:", hash);
      setSpinTxHash(hash);
    } catch (err) {
      console.error("Spin error:", err);
      setIsSpinning(false);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to spin roulette");
      }
    }
  };

  const startGame = async () => {
    if (!isConnected) return;

    setError(null);

    try {
      console.log("Starting game:", gameId);

      const hash = await writeContractAsync({
        address: GameContract.address as `0x${string}`,
        abi: GameContract.abi,
        functionName: "startGame",
        args: [BigInt(gameId)],
      });

      console.log("Start game transaction submitted:", hash);

      // Refetch game status after transaction
      setTimeout(() => {
        refetchGameStatus();
        refetchPlayers();
      }, 2000);
    } catch (err) {
      console.error("Start game error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to start game");
      }
    }
  };

  const getGameStatusText = () => {
    if (!gameStatus || !Array.isArray(gameStatus)) return "Loading...";

    const status = gameStatus[2];
    switch (status) {
      case 0:
        return "Waiting for Players";
      case 1:
        return "In Progress";
      case 2:
        return "Game Ended";
      default:
        return "Unknown";
    }
  };

  const canStartGame = () => {
    return (
      gameStatus &&
      Array.isArray(gameStatus) &&
      gameStatus[2] === 0 && // GameStatus.Active
      players.length === 5 &&
      isConnected
    );
  };

  const canSpin = () => {
    return (
      gameStatus &&
      Array.isArray(gameStatus) &&
      gameStatus[2] === 1 && // GameStatus.InProgress
      players.length > 1 &&
      isConnected &&
      !isSpinning
    );
  };

  return (
    <BackgroundImgBlur>
      <div
        className={`${openSans.className} justify-start flex fixed space-y-4 top-5 left-2 flex-col rounded-lg z-50 mt-2 py-1 px-15 transition-all duration-300 bg-[#030b1f]`}
      >
        <h2 className="text-white text-2xl mb-1 font-bold">
          <span className="text-[#FF3B3B]">WIN</span> or LOSE
        </h2>
        <p className="text-sm text-white">
          Last man standing stands a chance to{" "}
          <span className="text-[#FF3B3B]">WIN BIG !!!</span>
        </p>
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeIn" }}
          className="text-white rounded-lg text-lg"
        >
          <span className="text-gray-400">
            {addresses[index].slice(0, 4)}****{addresses[index].slice(-4)}
          </span>
          <span className="ml-2">just won</span>
          <span className="ml-2 text-red-500 font-bold">{winnings[index]}</span>
        </motion.div>
      </div>

      <div className="flex justify-center items-center space-x-44 mt-10">
        {/* Player List and Game Info on the Left */}
        <div className="text-white p-4 flex flex-col backdrop-blur-xs">
          <h2 className="text-xl font-bold mb-2">Game #{gameId}</h2>
          <p className="text-sm text-gray-300 mb-4">
            Status: {getGameStatusText()}
          </p>

          {gameStatus && Array.isArray(gameStatus) && (
            <div className="mb-4 text-sm">
              <p>
                Stake Amount:{" "}
                {gameStatus[1]
                  ? (Number(gameStatus[1]) / 10 ** 18).toFixed(4)
                  : "0"}{" "}
                CORE
              </p>
              <p>Players: {players.length}/5</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-2 bg-red-900 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {!isConnected && (
            <div className="mb-4 p-2 bg-yellow-900 rounded text-yellow-300 text-sm">
              Please connect your wallet to interact
            </div>
          )}

          {canStartGame() && (
            <button
              onClick={startGame}
              className="mb-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Start Game
            </button>
          )}

          <h3 className="text-lg font-bold mb-2">Players</h3>
          {players.map((player, index) => (
            <div
              key={index}
              className="mb-2 p-2 border-b border-gray-700 flex space-x-4"
            >
              <p
                className={`text-sm font-semibold ${
                  player.status === "Eliminated"
                    ? "line-through text-red-400"
                    : ""
                }`}
              >
                {player.name}
              </p>
              <p className="text-sm text-gray-400">
                {player.address?.slice(0, 4)}****{player.address?.slice(-4)}
              </p>
              <p
                className={`text-sm ${
                  player.status === "Still in"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {player.status}
              </p>
            </div>
          ))}

          {winner && (
            <div className="mt-4 p-4 bg-green-900 rounded-lg">
              <h3 className="text-xl font-bold text-green-300">🎉 Winner!</h3>
              <p className="text-green-200">{winner} wins the entire pot!</p>
            </div>
          )}
        </div>

        {/* Wheel on the Right */}
        <div className="relative w-64 h-64">
          <div
            className={`w-full h-full rounded-full border-4 border-red-500 flex items-center justify-center transition-transform duration-[4000ms] ease-out ${
              isSpinning ? "pointer-events-none" : ""
            }`}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: "transform 4s ease-out",
            }}
          >
            <div
              className={`absolute w-20 h-20 rounded-full flex items-center justify-center font-bold text-lg shadow-lg z-10 cursor-pointer ${
                canSpin()
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              }`}
              onClick={spinWheel}
            >
              {isSpinning ? "..." : "SPIN"}
            </div>
            <div className="absolute w-full h-full flex flex-col items-center justify-center">
              {players.map((player, index) => (
                <div
                  key={index}
                  className={`absolute w-20 h-20 flex items-center justify-center rounded-full font-semibold text-xs ${
                    player.status === "Eliminated"
                      ? "line-through text-red-400 bg-gray-800"
                      : "bg-red-500 text-white"
                  }`}
                  style={{
                    transform: `rotate(${
                      index * (360 / players.length)
                    }deg) translateY(-85px) rotate(-${
                      index * (360 / players.length)
                    }deg)`,
                  }}
                >
                  {player.name}
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex items-center justify-center top-[-255px]">
            <div className="w-0 h-0 border-l-4 border-r-4 border-l-transparent border-r-transparent border-t-20 border-t-white"></div>
          </div>
        </div>
      </div>
    </BackgroundImgBlur>
  );
};

export default WheelOfFortune;
