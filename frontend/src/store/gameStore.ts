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
  selectedGame: GameInfo | null;
  activeTab: "active" | "my-games";

  setLoading: (state: boolean) => void;
  setActiveGames: (games: GameInfo[]) => void;
  setMyGames: (games: GameInfo[]) => void;
  updateGameStatus: (gameId: bigint, status: GameStatus) => void;
  clearGames: () => void;

  setSelectedGame: (game: GameInfo | null) => void;

  setFilters: (filters: GameStore["filters"]) => void;

  setActiveTab: (tab: "active" | "my-games") => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  activeGames: [],
  myGames: [],
  filters: {
    sortBy: "newest",
    sortOrder: "desc",
    minStake: "0",
    status: GameStatus.Active,
  },
  loading: false,
  selectedGame: null,
  activeTab: "active",

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

  setSelectedGame: (game) => set({ selectedGame: game }),

  setFilters: (filters) => set({ filters }),

  setActiveTab: (tab) => set({ activeTab: tab }),
}));
