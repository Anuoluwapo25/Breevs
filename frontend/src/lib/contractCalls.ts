"use client";

import { openContractCall, ContractCallOptions } from "@stacks/connect";
import {
  uintCV,
  cvToJSON,
  cvToValue,
  ClarityType,
  ClarityValue,
  principalCV,
  fetchCallReadOnlyFunction,
  standardPrincipalCV,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { clarityToJSON } from "@/utils/clarity";
import { waitForTxConfirmation } from "@/utils/waitForTx";
import { buildStxPostConditions } from "@/utils/postConditionHelper";
import { mapContractError } from "@/utils/contractErrors";

export enum GameStatus {
  Active = 0,
  InProgress = 1,
  Ended = 2,
}

interface GameInfoTuple {
  creator: { type: ClarityType.PrincipalStandard; value: string };
  players: {
    type: ClarityType.List;
    value: { type: ClarityType.PrincipalStandard; value: string }[];
  };
  stake: { type: ClarityType.UInt; value: string | number };
  "prize-pool": { type: ClarityType.UInt; value: string | number };
  status: { type: ClarityType.UInt; value: string | number };
  "round-duration": { type: ClarityType.UInt; value: string | number };
  "round-end": { type: ClarityType.UInt; value: string | number };
  "current-round": { type: ClarityType.UInt; value: string | number };
  winner:
    | { type: ClarityType.OptionalNone }
    | {
        type: ClarityType.OptionalSome;
        value: { type: ClarityType.PrincipalStandard; value: string };
      };
  "total-rounds": { type: ClarityType.UInt; value: string | number };
}

export interface GameInfo {
  gameId: bigint;
  creator: string;
  stake: bigint;
  playerCount: number;
  status: GameStatus;
  players: string[];
  prizePool: bigint;
  winner: string | null;
  currentRound: number;
  roundEnd: bigint;
  roundDuration: bigint;
  totalRounds: number;
}

export interface PlayerData {
  eliminated: boolean;
  eliminationRound: number;
  currentRound: number;
  roundEnd: number;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalWinnings: bigint;
  totalStaked: bigint;
}

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "ST168JS95Y70CV8T7T63GF8V420FG2VCBZ5TXP2DA";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME || "Breevs-v2";
const APP_DETAILS = { name: "Breevs", icon: "/favicon.ico" };

// =============================
// WRITE FUNCTIONS
// =============================

export async function createGame(
  stake: bigint,
  duration: bigint,
  stxAddress: string
): Promise<{ txId: string; gameId: bigint }> {
  return new Promise(async (resolve, reject) => {
    if (!stxAddress) {
      const error = new Error("No wallet address connected");
      return reject(error);
    }

    try {
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
          try {
            const txId = data?.txId;
            if (!txId) throw new Error("Missing txId");

            const confirmed = await waitForTxConfirmation(txId, 60, 3000);
            if (!confirmed) {
              throw new Error("Transaction not confirmed");
            }

            const gameCounter = await fetchCallReadOnlyFunction({
              contractAddress: CONTRACT_ADDRESS,
              contractName: CONTRACT_NAME,
              functionName: "get-total-games",
              functionArgs: [],
              senderAddress: CONTRACT_ADDRESS,
              network: STACKS_TESTNET,
            });
            const gameId = BigInt(cvToValue(gameCounter));

            resolve({ txId, gameId });
          } catch (error) {
            const mappedError = mapContractError(error);
            reject(new Error(mappedError.message));
          }
        },
        onCancel: () => {
          const error = new Error("User canceled game creation");
          reject(error);
        },
      };

      openContractCall(options);
    } catch (error) {
      const mappedError = mapContractError(error);
      reject(new Error(mappedError.message));
    }
  });
}

export async function joinGame(
  gameId: bigint,
  stake: bigint,
  stxAddress: string
): Promise<{ txId: string }> {
  return new Promise(async (resolve, reject) => {
    if (!stxAddress) {
      const error = new Error("No wallet address connected");
      reject(error);
      return;
    }

    try {
      const gameInfo = await getGameInfo(gameId);
      if (gameInfo.stake !== stake) {
        const error = new Error(
          "Stake amount does not match game requirements"
        );
        throw error;
      }
      const pcResult = await buildStxPostConditions(gameInfo.creator, stake);

      const options: ContractCallOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "join-game",
        functionArgs: [uintCV(gameId)],
        network: STACKS_TESTNET,
        appDetails: APP_DETAILS,
        postConditionMode: pcResult.postConditionMode,
        ...("postConditions" in pcResult
          ? { postConditions: pcResult.postConditions }
          : {}),
        onFinish: async (data) => {
          try {
            const txId = data?.txId;
            if (!txId) throw new Error("Missing txId");

            const confirmed = await waitForTxConfirmation(txId, 60, 3000);
            if (!confirmed) {
              throw new Error("Transaction not confirmed");
            }

            resolve({ txId });
          } catch (error) {
            const mappedError = mapContractError(error);
            reject(new Error(mappedError.message));
          }
        },
        onCancel: () => {
          const error = new Error("User canceled join game");
          reject(error);
        },
      };
      openContractCall(options);
    } catch (error) {
      const mappedError = mapContractError(error);
      reject(new Error(mappedError.message));
    }
  });
}

export async function startGame(gameId: bigint): Promise<{ txId: string }> {
  return new Promise((resolve, reject) => {
    const options: ContractCallOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "start-game",
      functionArgs: [uintCV(gameId)],
      network: STACKS_TESTNET,
      appDetails: APP_DETAILS,
      onFinish: async (data) => {
        try {
          const txId = data?.txId;
          if (!txId) throw new Error("Missing txId");

          const confirmed = await waitForTxConfirmation(txId, 60, 3000);
          if (!confirmed) throw new Error("Transaction not confirmed");

          resolve({ txId });
        } catch (error) {
          reject(new Error(mapContractError(error).message));
        }
      },
      onCancel: () => reject(new Error("User canceled startGame")),
    };
    openContractCall(options);
  });
}

export async function spin(
  gameId: bigint
): Promise<{ spinTX: { txId: string; value: string } }> {
  return new Promise((resolve, reject) => {
    const options: ContractCallOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "spin",
      functionArgs: [uintCV(gameId)],
      network: STACKS_TESTNET,
      appDetails: APP_DETAILS,
      onFinish: async (data) => {
        try {
          const txId = data?.txId;
          if (!txId) throw new Error("Missing txId");

          const confirmed = await waitForTxConfirmation(txId, 60, 3000);
          if (!confirmed) throw new Error("Transaction not confirmed");

          const txResult = await fetchTransactionResult(txId);
          const value = txResult?.value?.value || "";
          resolve({ spinTX: { txId, value } });
        } catch (error) {
          reject(new Error(mapContractError(error).message));
        }
      },
      onCancel: () => reject(new Error("User canceled spin")),
    };
    openContractCall(options);
  });
}

export async function advanceRound(gameId: bigint): Promise<{ txId: string }> {
  return new Promise((resolve, reject) => {
    const options: ContractCallOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "advance-round",
      functionArgs: [uintCV(gameId)],
      network: STACKS_TESTNET,
      appDetails: APP_DETAILS,
      onFinish: async (data) => {
        try {
          const txId = data?.txId;
          if (!txId) throw new Error("Missing txId");

          const confirmed = await waitForTxConfirmation(txId, 60, 3000);
          if (!confirmed) throw new Error("Transaction not confirmed");

          resolve({ txId });
        } catch (error) {
          reject(new Error(mapContractError(error).message));
        }
      },
      onCancel: () => reject(new Error("User canceled advanceRound")),
    };
    openContractCall(options);
  });
}

export async function claimPrize(gameId: bigint): Promise<{ txId: string }> {
  return new Promise((resolve, reject) => {
    const options: ContractCallOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "claim-prize",
      functionArgs: [uintCV(gameId)],
      network: STACKS_TESTNET,
      appDetails: APP_DETAILS,
      onFinish: async (data) => {
        try {
          const txId = data?.txId;
          if (!txId) throw new Error("Missing txId");

          const confirmed = await waitForTxConfirmation(txId, 60, 3000);
          if (!confirmed) throw new Error("Transaction not confirmed");

          resolve({ txId });
        } catch (error) {
          reject(new Error(mapContractError(error).message));
        }
      },
      onCancel: () => reject(new Error("User canceled claimPrize")),
    };
    openContractCall(options);
  });
}

// =============================
// READ FUNCTIONS
// =============================

export async function getTotalGames(): Promise<bigint> {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-total-games",
      functionArgs: [],
      network: STACKS_TESTNET,
      senderAddress: CONTRACT_ADDRESS,
    });
    return BigInt(cvToValue(result));
  } catch (error) {
    throw new Error(mapContractError(error).message);
  }
}

export async function getGameInfo(gameId: bigint): Promise<GameInfo> {
  try {
    const result: ClarityValue = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-game-info",
      functionArgs: [uintCV(gameId)],
      network: STACKS_TESTNET,
      senderAddress: CONTRACT_ADDRESS,
    });

    if (result.type === ClarityType.OptionalNone) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (
      result.type !== ClarityType.OptionalSome ||
      !result.value ||
      result.value.type !== ClarityType.Tuple
    ) {
      throw new Error(
        `Invalid response structure for gameId ${gameId}: expected optional tuple`
      );
    }

    const jsonData = cvToJSON(result.value);

    const data: GameInfoTuple = jsonData.value as GameInfoTuple;

    if (!data || typeof data !== "object") {
      throw new Error(`Invalid tuple data for gameId ${gameId}`);
    }

    const toBigInt = (
      value: string | number | bigint | undefined,
      field: string
    ): bigint => {
      if (value == null) {
        throw new Error(`Missing ${field} for gameId ${gameId}`);
      }
      try {
        return BigInt(value);
      } catch {
        throw new Error(
          `Invalid ${field} format for gameId ${gameId}: ${value}`
        );
      }
    };

    const toNumber = (
      value: string | number | bigint | undefined,
      field: string
    ): number => {
      if (value == null) {
        throw new Error(`Missing ${field} for gameId ${gameId}`);
      }
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(
          `Invalid ${field} format for gameId ${gameId}: ${value}`
        );
      }
      return num;
    };

    const creator = data.creator?.value;
    if (!creator || typeof creator !== "string") {
      throw new Error(`Invalid creator for gameId ${gameId}: ${creator}`);
    }

    const players = data.players?.value ?? [];
    if (!Array.isArray(players)) {
      throw new Error(`Invalid players list for gameId ${gameId}`);
    }
    const playerAddresses = players.map((p) => {
      if (!p.value || typeof p.value !== "string") {
        throw new Error(
          `Invalid player address in players list for gameId ${gameId}`
        );
      }
      return p.value;
    });

    const winner =
      data.winner.type === "none" ? null : data.winner.value?.value;
    if (winner != null && typeof winner !== "string") {
      throw new Error(`Invalid winner format for gameId ${gameId}: ${winner}`);
    }

    return {
      gameId,
      creator,
      stake: toBigInt(data.stake?.value, "stake"),
      playerCount: toNumber(players.length, "playerCount"),
      status: toNumber(data.status?.value, "status") as GameStatus,
      players: playerAddresses,
      prizePool: toBigInt(data["prize-pool"]?.value, "prize-pool"),
      winner,
      currentRound: toNumber(data["current-round"]?.value, "current-round"),
      roundEnd: toBigInt(data["round-end"]?.value, "round-end"),
      roundDuration: toBigInt(data["round-duration"]?.value, "round-duration"),
      totalRounds: toNumber(data["total-rounds"]?.value, "total-rounds"),
    };
  } catch (error) {
    console.error(`getGameInfo error for gameId ${gameId}:`, error);
    throw new Error(
      `Failed to fetch game info for gameId ${gameId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function getPlayerData(
  gameId: bigint,
  player: string
): Promise<PlayerData> {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-player-game-data",
      functionArgs: [uintCV(gameId), principalCV(player)],
      network: STACKS_TESTNET,
      senderAddress: CONTRACT_ADDRESS,
    });

    if (!result || result.type === "none") {
      throw new Error(`Player data for ${player} in game ${gameId} not found`);
    }

    const clarityData = clarityToJSON(result);
    return {
      eliminated: clarityData.eliminated,
      eliminationRound: Number(clarityData["elimination-round"]),
      currentRound: Number(clarityData["current-round"]),
      roundEnd: Number(clarityData["round-end"]),
    };
  } catch (error) {
    throw new Error(mapContractError(error).message);
  }
}

export async function getUserStats(user: string): Promise<UserStats> {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "get-user-stats",
      functionArgs: [principalCV(user)],
      network: STACKS_TESTNET,
      senderAddress: CONTRACT_ADDRESS,
    });

    const clarityData = clarityToJSON(result);
    return {
      gamesPlayed: Number(clarityData["games-played"]),
      gamesWon: Number(clarityData["games-won"]),
      totalWinnings: BigInt(clarityData["total-winnings"]),
      totalStaked: BigInt(clarityData["total-staked"]),
    };
  } catch (error) {
    throw new Error(mapContractError(error).message);
  }
}

export async function getAllGameIds(): Promise<bigint[]> {
  try {
    const counter = await getTotalGames();
    const ids: bigint[] = [];
    for (let i = 1n; i <= counter; i++) {
      ids.push(i);
    }
    return ids;
  } catch (error) {
    throw new Error(mapContractError(error).message);
  }
}

export async function isPrizeClaimed(
  gameId: bigint,
  user: string
): Promise<boolean> {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "is-prize-claimed",
      functionArgs: [uintCV(gameId), standardPrincipalCV(user)],
      network: STACKS_TESTNET,
      senderAddress: CONTRACT_ADDRESS,
    });
    return cvToJSON(result).value;
  } catch (error) {
    throw new Error(
      `Failed to check prize claimed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function isUserInGame(
  gameId: bigint,
  user: string
): Promise<boolean> {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "is-user-in-game",
      functionArgs: [uintCV(gameId), principalCV(user)],
      network: STACKS_TESTNET,
      senderAddress: CONTRACT_ADDRESS,
    });
    return cvToValue(result);
  } catch (error) {
    throw new Error(mapContractError(error).message);
  }
}

export async function isGameCreator(
  gameId: bigint,
  user: string
): Promise<boolean> {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "is-game-creator",
      functionArgs: [uintCV(gameId), principalCV(user)],
      network: STACKS_TESTNET,
      senderAddress: CONTRACT_ADDRESS,
    });
    return cvToValue(result);
  } catch (error) {
    throw new Error(mapContractError(error).message);
  }
}

// Helper to fetch transaction result (for spin)
async function fetchTransactionResult(txId: string): Promise<any> {
  try {
    const response = await fetch(
      `https://stacks-node-api.testnet.stacks.co/extended/v1/tx/${txId}`
    );
    const tx = await response.json();
    if (tx.tx_status !== "success") {
      throw new Error(
        `Transaction ${txId} failed: ${tx.tx_result?.repr || "Unknown error"}`
      );
    }
    return tx?.tx_result;
  } catch (error) {
    throw new Error(mapContractError(error).message);
  }
}
