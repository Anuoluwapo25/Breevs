import { create } from "zustand";
import { GameStatus, GameInfo } from "@/lib/contractCalls";

interface GameStore {
  activeGames: GameInfo[];
  myGames: GameInfo[];
  filters: {
    sortBy: string;
    sortOrder: string;
    minStake: string;
    status: GameStatus;
  };
  loading: boolean;
  setLoading: (state: boolean) => void;
  setActiveGames: (games: GameInfo[]) => void;
  setMyGames: (games: GameInfo[]) => void;
  updateGameStatus: (gameId: bigint, status: GameStatus) => void;
  clearGames: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  activeGames: [],
  myGames: [],
  filters: {
    sortBy: "newest",
    sortOrder: "desc",
    minStake: "0",
    status: GameStatus.Active,
  },
  loading: false,
  setLoading: (state) => set({ loading: state }),
  setActiveGames: (games) => set({ activeGames: games }),
  setMyGames: (games) => set({ myGames: games }),
  updateGameStatus: (gameId, status) =>
    set((state) => ({
      activeGames: state.activeGames.map((g) =>
        g.gameId === gameId ? { ...g, status } : g
      ),
      myGames: state.myGames.map((g) =>
        g.gameId === gameId ? { ...g, status } : g
      ),
    })),
  clearGames: () => set({ activeGames: [], myGames: [] }),
}));
