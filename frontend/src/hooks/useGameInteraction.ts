"use client";

import { useCallback, useState } from "react";
import { useJoinGameRoom, joinGame } from "@/hooks/useGame";
import { useWaitForTransactionReceipt } from "wagmi";

export function useGameInteraction() {
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string>();
  const { writeAsync: joinGameRoom } = useJoinGameRoom();

  const handleJoinGame = useCallback(
    async (gameId: bigint, stakeAmount: bigint) => {
      setError(undefined);
      setIsJoining(true);

      try {
        const tx = await joinGame(joinGameRoom, gameId, stakeAmount);
        console.log("Joining game:", tx.hash);

        const receipt = await tx.wait();
        if (!receipt?.status) {
          throw new Error("Failed to join game");
        }

        return true;
      } catch (err) {
        console.error("Error joining game:", err);
        setError(err instanceof Error ? err.message : "Failed to join game");
        return false;
      } finally {
        setIsJoining(false);
      }
    },
    [joinGameRoom]
  );

  return {
    handleJoinGame,
    isJoining,
    error,
    clearError: () => setError(undefined),
  };
}