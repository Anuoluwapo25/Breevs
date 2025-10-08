"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGameInfo,
  getPlayerData,
  getUserStats,
  createGame,
  getAllGames,
  joinGame,
  startGame,
  spin,
  advanceRound,
  claimPrize,
  GameStatus,
  GameInfo,
} from "@/lib/contractCalls";
import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";

// ----------------------
// READ HOOKS
// ----------------------

export function useGameInfo(gameId: bigint) {
  return useQuery({
    queryKey: ["gameInfo", gameId],
    queryFn: () => getGameInfo(gameId),
    enabled: !!gameId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useGamePlayer(gameId: bigint, player: string) {
  return useQuery({
    queryKey: ["gamePlayer", gameId, player],
    queryFn: () => getPlayerData(gameId, player),
    enabled: !!gameId && !!player,
  });
}

export function useUserStats(user: string) {
  return useQuery({
    queryKey: ["userStats", user],
    queryFn: () => getUserStats(user),
    enabled: !!user,
  });
}

export function useAllGames() {
  return useQuery<GameInfo[], Error>({
    queryKey: ["allGames"],
    queryFn: getAllGames,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

// Fetch only ACTIVE Games
export function useActiveGames() {
  const { setActiveGames } = useGameStore();
  const query = useQuery<GameInfo[], Error>({
    queryKey: ["activeGames"],
    queryFn: async () => {
      const all = await getAllGames();
      return all.filter(
        (g) =>
          g.status === GameStatus.Active || g.status === GameStatus.InProgress
      );
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data) setActiveGames(query.data);
  }, [query.data, setActiveGames]);

  return query;
}

// Fetch only MY Games
export function useMyGames(user: string) {
  const { setMyGames } = useGameStore();
  const query = useQuery<GameInfo[]>({
    queryKey: ["myGames", user],
    queryFn: async () => {
      if (!user) return [];
      const all = await getAllGames();
      return all.filter((g) => g.creator.toLowerCase() === user.toLowerCase());
    },
    enabled: !!user,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data) setMyGames(query.data);
  }, [query.data, setMyGames]);

  return query;
}

// Game Status (Zustand + React Query)
export function useGameStatus(gameId: bigint) {
  const { updateGameStatus } = useGameStore();

  const query = useQuery({
    queryKey: ["gameStatus", gameId.toString()],
    queryFn: () => getGameInfo(gameId),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    enabled: !!gameId,
  });

  useEffect(() => {
    if (query.data) {
      updateGameStatus(gameId, query.data.status);
    }
  }, [query.data, gameId, updateGameStatus]);

  return query;
}

// ----------------------
// WRITE HOOKS
// ----------------------

export function useCreateGame() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      stake,
      duration,
      stxAddress,
    }: {
      stake: bigint;
      duration: bigint;
      stxAddress: string;
    }) => createGame(stake, duration, stxAddress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeGames"] });
      qc.invalidateQueries({ queryKey: ["myGames"] });
    },
  });
}

export function useJoinGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId }: { gameId: bigint }) => joinGame(gameId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeGames"] });
      qc.invalidateQueries({ queryKey: ["myGames"] });
    },
  });
}

export function useStartGame() {
  return useMutation({
    mutationFn: ({ gameId }: { gameId: bigint }) => startGame(gameId),
  });
}

export function useSpin() {
  return useMutation({
    mutationFn: ({ gameId }: { gameId: bigint }) => spin(gameId),
  });
}

export function useAdvanceRound() {
  return useMutation({
    mutationFn: ({ gameId }: { gameId: bigint }) => advanceRound(gameId),
  });
}

export function useClaimPrize() {
  return useMutation({
    mutationFn: ({ gameId }: { gameId: bigint }) => claimPrize(gameId),
  });
}
