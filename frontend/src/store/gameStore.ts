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
  currentPlayerGame: GameInfo | null;
  currentCreatorGame: GameInfo | null;

  setLoading: (state: boolean) => void;
  setActiveGames: (games: GameInfo[]) => void;
  setMyGames: (games: GameInfo[]) => void;
  updateGameStatus: (gameId: bigint, status: GameStatus) => void;
  clearGames: () => void;
  setSelectedGame: (game: GameInfo | null) => void;
  setFilters: (filters: GameStore["filters"]) => void;
  setActiveTab: (tab: "active" | "my-games") => void;
  setCurrentPlayerGame: (game: GameInfo | null) => void;
  setCurrentCreatorGame: (game: GameInfo | null) => void;
  restrictPlayerActions: (stxAddress: string) => boolean;
  restrictCreatorActions: (stxAddress: string) => boolean;
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
  currentPlayerGame: null,
  currentCreatorGame: null,

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
      currentPlayerGame:
        state.currentPlayerGame?.gameId === gameId
          ? { ...state.currentPlayerGame, status }
          : state.currentPlayerGame,
      currentCreatorGame:
        state.currentCreatorGame?.gameId === gameId
          ? { ...state.currentCreatorGame, status }
          : state.currentCreatorGame,
    })),

  clearGames: () =>
    set({
      activeGames: [],
      myGames: [],
      currentPlayerGame: null,
      currentCreatorGame: null,
    }),

  setSelectedGame: (game) => set({ selectedGame: game }),

  setFilters: (filters) => set({ filters }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setCurrentPlayerGame: (game) => set({ currentPlayerGame: game }),

  setCurrentCreatorGame: (game) => set({ currentCreatorGame: game }),

  restrictPlayerActions: (stxAddress) => {
    const { myGames } = get();
    return myGames.some(
      (game) =>
        game.players.includes(stxAddress) && game.status !== GameStatus.Ended
    );
  },

  restrictCreatorActions: (stxAddress) => {
    const { myGames } = get();
    return myGames.some(
      (game) => game.creator === stxAddress && game.status !== GameStatus.Ended
    );
  },
}));
