"use client";

import { openContractCall, ContractCallOptions } from "@stacks/connect";
import {
  uintCV,
  cvToJSON,
  cvToValue,
  hexToCV,
  principalCV,
  fetchCallReadOnlyFunction,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { clarityToJSON } from "@/utils/clarity";
import { waitForTxConfirmation } from "@/utils/waitForTx";

export enum GameStatus {
  Active = 0,
  InProgress = 1,
  Ended = 2,
}

export interface GameInfo {
  gameId: bigint;
  creator: string;
  stakeAmount: bigint;
  status: GameStatus;
  playerCount: number;
  players: string[];
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
  duration: bigint
): Promise<{ txId: string; gameId: bigint | null }> {
  return new Promise((resolve, reject) => {
    const options: ContractCallOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "create-game",
      functionArgs: [uintCV(stake), uintCV(duration)],
      network: STACKS_TESTNET,
      appDetails: APP_DETAILS,

      onFinish: async (data: any) => {
        console.log("✅ createGame TX:", data);

        const txId = data?.txId;
        if (!txId) {
          console.error("⚠️ No txId found in createGame result");
          return reject(new Error("Missing txId"));
        }

        // 1️⃣ Wait for confirmation on-chain
        const confirmed = await waitForTxConfirmation(txId);

        if (confirmed) {
          console.log("✅ Game creation confirmed — fetching all games...");

          const games = await getAllGames();
          const latestGame = games[games.length - 1];

          resolve({
            txId,
            gameId: latestGame?.gameId ?? null,
          });
        } else {
          reject(new Error("Transaction not confirmed"));
        }
      },

      onCancel: () => reject(new Error("User canceled createGame")),
    };

    void openContractCall(options);
  });
}

export async function getAllGames(): Promise<GameInfo[]> {
  console.log("%c🔍 Fetching total number of games...", "color: cyan;");

  // 1️⃣ Get total number of games
  const totalGamesResponse = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-total-games",
    network: STACKS_TESTNET,
    senderAddress: CONTRACT_ADDRESS,
    functionArgs: [],
  });

  console.log(
    "%c🧩 Raw totalGamesResponse:",
    "color: gray;",
    totalGamesResponse
  );

  // Convert to Clarity value
  const totalGamesCV =
    typeof totalGamesResponse === "object" && "result" in totalGamesResponse
      ? hexToCV(totalGamesResponse.result as string)
      : totalGamesResponse;

  console.log(
    "%c📦 Decoded ClarityValue (total games):",
    "color: orange;",
    totalGamesCV
  );

  const totalGames = Number(cvToValue(totalGamesCV));
  console.log("%c🎮 Total Games:", "color: lime;", totalGames);

  if (totalGames === 0) {
    console.log("%c⚠️ No games found.", "color: yellow;");
    return [];
  }

  // 2️⃣ Prepare read-only calls for each game
  console.log("%c🚀 Fetching individual games...", "color: cyan;");
  const gameCalls = Array.from({ length: totalGames }, (_, i) =>
    fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-game-by-id",
      network: STACKS_TESTNET,
      senderAddress: CONTRACT_ADDRESS,
      functionArgs: [uintCV(i + 1)],
    })
      .then((res) => {
        console.log(`%c📥 Raw Game #${i + 1} Response:`, "color: gray;", res);

        const clarityValue =
          typeof res === "object" && "result" in res
            ? hexToCV(res.result as string)
            : typeof res === "string"
            ? hexToCV(res)
            : res;

        const decoded = cvToValue(clarityValue);

        console.log(`%c✅ Decoded Game #${i + 1}:`, "color: lime;", decoded);

        return decoded ? { ...decoded, gameId: BigInt(i + 1) } : null;
      })
      .catch((err) => {
        console.error(`❌ Error fetching game #${i + 1}:`, err);
        return null;
      })
  );

  // 3️⃣ Wait for all games to resolve
  const results = await Promise.all(gameCalls);

  // 4️⃣ Filter valid results
  const validGames = results.filter((game): game is GameInfo => game !== null);

  console.log("%c🎯 Final Game List:", "color: magenta;", validGames);

  return validGames;
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

  return {
    gameId,
    creator: clarityData.creator,
    stakeAmount: BigInt(clarityData.stake),
    status: Number(clarityData.status) as GameStatus,
    playerCount: Number(clarityData.player_count ?? 0),
    players: clarityData.players ?? [],
    winner: clarityData.winner ?? null,
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
