import { useReadContract, useWriteContract } from "wagmi";
import { gameConfig } from "@/config/contracts";
import { parseEther } from "viem";

// Game State Types
export enum GameStatus {
  Active = 0,
  InProgress = 1,
  Ended = 2,
}

export interface GameInfo {
  creator: `0x${string}`;
  stakeAmount: bigint;
  status: GameStatus;
  playerCount: number;
}

// Read Hooks
export function useGameStatus(gameId: bigint) {
  return useReadContract({
    ...gameConfig,
    functionName: "getGameStatus",
    args: [gameId],
  });
}

// Helper function to get game status
export async function getGameStatus(
  provider: any,
  gameId: bigint
): Promise<GameInfo | null> {
  try {
    const status = await provider.readContract({
      ...gameConfig,
      functionName: "getGameStatus",
      args: [gameId],
    });
    return status;
  } catch (error) {
    console.error("Error fetching game status:", error);
    return null;
  }
}

export function useGamePlayers(gameId: bigint) {
  return useReadContract({
    ...gameConfig,
    functionName: "getPlayers",
    args: [gameId],
  });
}

export function useActiveGames() {
  return useReadContract({
    ...gameConfig,
    functionName: "getAllActiveGames",
  });
}

// Write Hooks
export function useCreateGameRoom() {
  return useWriteContract({
    ...gameConfig,
    functionName: "createGameRoom",
  });
}

export function useJoinGameRoom() {
  return useWriteContract({
    ...gameConfig,
    functionName: "joinGameRoom",
  });
}

export function useStartGame() {
  return useWriteContract({
    ...gameConfig,
    functionName: "startGame",
  });
}

export function useSpinRoulette() {
  return useWriteContract({
    ...gameConfig,
    functionName: "spinRoulette",
  });
}

// Helper function to create a game
export async function createGame(
  createGameRoom: ReturnType<typeof useCreateGameRoom>["writeContractAsync"],
  stakeAmount: string
) {
  if (!createGameRoom) throw new Error("Create game function not available");

  const stake = parseEther(stakeAmount);
  return createGameRoom({
    args: [stake],
    value: stake,
  });
}

// Helper function to join a game
export async function joinGame(
  joinGameRoom: ReturnType<typeof useJoinGameRoom>["writeContractAsync"],
  gameId: bigint,
  stakeAmount: bigint
) {
  if (!joinGameRoom) throw new Error("Join game function not available");

  return joinGameRoom({
    args: [gameId],
    value: stakeAmount,
  });
}

// Helper function to start a game
export async function startGame(
  start: ReturnType<typeof useStartGame>["writeContractAsync"],
  gameId: bigint
) {
  if (!start) throw new Error("Start game function not available");

  return start({
    args: [gameId],
  });
}

// Helper function to spin
export async function spin(
  spinRoulette: ReturnType<typeof useSpinRoulette>["writeContractAsync"],
  gameId: bigint
) {
  if (!spinRoulette) throw new Error("Spin function not available");

  return spinRoulette({
    args: [gameId],
  });
}
