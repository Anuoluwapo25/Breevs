"use client";

import { openContractCall, ContractCallOptions } from "@stacks/connect";
import {
  uintCV,
  cvToJSON,
  cvToValue,
  principalCV,
  fetchCallReadOnlyFunction,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { clarityToJSON } from "@/utils/clarity";
import { waitForTxConfirmation } from "@/utils/waitForTx";
import { buildStxPostConditions } from "@/utils/postConditionHelper";

export enum GameStatus {
  Active = 0,
  InProgress = 1,
  Ended = 2,
}

export interface GameInfo {
  gameId: bigint;
  creator: string;
  stake: bigint;
  status: GameStatus;
  playerCount: number;
  players: string[];
  prizePool: bigint;
  winner: string | null;
}

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "ST168JS95Y70CV8T7T63GF8V420FG2VCBZ5TXP2DA";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME || "Breevs-v2";
const APP_DETAILS = { name: "Breevs", icon: "/favicon.ico" };

// =============================
//  WRITE FUNCTIONS
// =============================
export async function createGame(
  stake: bigint,
  duration: bigint,
  stxAddress: string
): Promise<{ txId: string; gameId: bigint | null }> {
  return new Promise(async (resolve, reject) => {
    if (!stxAddress) return reject(new Error("No wallet address connected"));

    const pcResult = await buildStxPostConditions(stxAddress, stake);
    const options: ContractCallOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "create-game",
      functionArgs: [uintCV(stake), uintCV(duration)],
      network: STACKS_TESTNET,
      appDetails: APP_DETAILS,
      postConditionMode: pcResult.postConditionMode,
      ...("postConditions" in pcResult
        ? { postConditions: pcResult.postConditions }
        : {}),

      onFinish: async (data: any) => {
        console.log("✅ createGame TX:", data);
        const txId = data?.txId;
        if (!txId) return reject(new Error("Missing txId"));

        // wait for confirmation
        const confirmed = await waitForTxConfirmation(txId, 60, 3000);
        if (!confirmed) return reject(new Error("Transaction not confirmed"));

        // refresh game list and resolve new id if found
        // const games = await getAllGames();
        // const latest = games[games.length - 1];
        // resolve({ txId, gameId: latest?.gameId ?? null });
        resolve({ txId, gameId: null });
      },

      onCancel: () => reject(new Error("User canceled createGame")),
    };

    // open wallet UI
    void openContractCall(options);
  });
}

export async function getAllGames(): Promise<GameInfo[]> {
  try {
    const totalGamesCV = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-total-games",
      functionArgs: [],
      senderAddress: CONTRACT_ADDRESS,
      network: STACKS_TESTNET,
    });

    const totalGames = Number(cvToValue(totalGamesCV));
    if (!totalGames) {
      return [];
    }

    const games: GameInfo[] = [];

    for (let i = 1; i <= totalGames; i++) {
      try {
        const gameCV = await fetchCallReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: "get-game-info",
          functionArgs: [uintCV(i)],
          senderAddress: CONTRACT_ADDRESS,
          network: STACKS_TESTNET,
        });

        if (!gameCV || gameCV.type === "none") {
          console.warn(`⚠ Game ${i} returned null or none`);
          continue;
        }

        const gameData = clarityToJSON(gameCV);
        if (!gameData || !gameData.creator) {
          console.warn(`⚠ Game ${i} missing creator — skipping`);
          continue;
        }

        games.push({
          gameId: BigInt(i),
          creator: gameData.creator,
          stake: BigInt(gameData.stake ?? 0n),
          prizePool: BigInt(gameData["prize-pool"] ?? 0n),
          status: Number(gameData.status ?? 0),
          players: Array.isArray(gameData.players) ? gameData.players : [],
          playerCount: Array.isArray(gameData.players)
            ? gameData.players.length
            : 0,
          winner: gameData.winner ?? null,
        });
      } catch (innerErr) {
        console.warn(`⚠ Skipping game ${i}:`, innerErr);
      }
    }

    return games;
  } catch (err: any) {
    console.error("❌ getAllGames failed:", err.message || err);
    return [];
  }
}

export function joinGame(gameId: bigint): Promise<{ txId: string }> {
  return new Promise((resolve, reject) => {
    const options: ContractCallOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "join-game",
      functionArgs: [uintCV(gameId)],
      network: STACKS_TESTNET,
      appDetails: APP_DETAILS,
      onFinish: (data) => resolve({ txId: data.txId }),
      onCancel: () => reject(new Error("User canceled joinGame")),
    };
    openContractCall(options);
  });
}

export async function startGame(gameId: bigint) {
  const options: ContractCallOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "start-game",
    functionArgs: [uintCV(gameId)],
    network: STACKS_TESTNET,
    appDetails: APP_DETAILS,
    onFinish: (data) => console.log("✅ startGame TX:", data),
    onCancel: () => console.log("❌ startGame cancelled"),
  };
  openContractCall(options);
}

export async function spin(gameId: bigint) {
  const options: ContractCallOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "spin",
    functionArgs: [uintCV(gameId)],
    network: STACKS_TESTNET,
    appDetails: APP_DETAILS,
    onFinish: (data) => console.log("✅ spin TX:", data),
    onCancel: () => console.log("❌ spin cancelled"),
  };
  openContractCall(options);
}

export async function advanceRound(gameId: bigint) {
  const options: ContractCallOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "advance-round",
    functionArgs: [uintCV(gameId)],
    network: STACKS_TESTNET,
    appDetails: APP_DETAILS,
    onFinish: (data) => console.log("✅ advanceRound TX:", data),
    onCancel: () => console.log("❌ advanceRound cancelled"),
  };
  openContractCall(options);
}

export async function claimPrize(gameId: bigint) {
  const options: ContractCallOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "claim-prize",
    functionArgs: [uintCV(gameId)],
    network: STACKS_TESTNET,
    appDetails: APP_DETAILS,
    onFinish: (data) => console.log("✅ claimPrize TX:", data),
    onCancel: () => console.log("❌ claimPrize cancelled"),
  };
  openContractCall(options);
}

// =============================
//  READ FUNCTIONS
// =============================

export async function getGameInfo(gameId: bigint): Promise<GameInfo> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-game-info",
    functionArgs: [uintCV(gameId)],
    network: STACKS_TESTNET,
    senderAddress: CONTRACT_ADDRESS,
  });

  const clarityData = clarityToJSON(result);

  const winner =
    clarityData.winner && clarityData.winner !== "none"
      ? clarityData.winner
      : null;

  return {
    gameId,
    creator: clarityData.creator,
    stake: BigInt(clarityData.stake || 0),
    status: Number(clarityData.status) as GameStatus,
    playerCount: Number(clarityData.players?.length ?? 0),
    players: clarityData.players ?? [],
    prizePool: BigInt(clarityData["prize-pool"] || 0),
    winner,
  };
}

export async function getPlayerData(gameId: bigint, player: string) {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-player-game-data",
    functionArgs: [uintCV(gameId), principalCV(player)],
    network: STACKS_TESTNET,
    senderAddress: CONTRACT_ADDRESS,
  });
  return clarityToJSON(result);
}

export async function getUserStats(user: string) {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-user-stats",
    functionArgs: [principalCV(user)],
    network: STACKS_TESTNET,
    senderAddress: CONTRACT_ADDRESS,
  });
  return clarityToJSON(result);
}

export async function getAllGameIds(): Promise<bigint[]> {
  const counterResponse = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "game-counter",
    network: STACKS_TESTNET,
    senderAddress: CONTRACT_ADDRESS,
    functionArgs: [],
  });

  const gameCounter = BigInt(cvToJSON(counterResponse).value);
  const ids: bigint[] = [];

  for (let i = 1n; i <= gameCounter; i++) {
    ids.push(i);
  }

  return ids;
}
