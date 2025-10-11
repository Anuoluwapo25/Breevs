"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gamepad2, BarChart2, Wallet } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useAccount } from "@micro-stacks/react";
import { GameStatus } from "@/lib/contractCalls";

export default function Navbar() {
  const pathname = usePathname();
  const { stxAddress } = useAccount();
  const { currentPlayerGame, currentCreatorGame } = useGameStore();

  const getGameUrl = () => {
    if (!stxAddress) return "/GameScreen";
    if (currentPlayerGame && currentPlayerGame.status !== GameStatus.Ended) {
      return `/GameScreen/${currentPlayerGame.gameId.toString()}`;
    }
    if (currentCreatorGame && currentCreatorGame.status !== GameStatus.Ended) {
      return `/GameScreen/${currentCreatorGame.gameId.toString()}`;
    }
    return "/GameScreen";
  };

  const navItems = [
    { href: "/Home", icon: Home },
    { href: getGameUrl(), icon: Gamepad2 },
    { href: "/LeaderBoard", icon: BarChart2 },
    { href: "/Wallet", icon: Wallet },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-[#121232] p-4 flex justify-around text-white z-50">
      {navItems.map(({ href, icon: Icon }) => {
        const isActive = pathname.startsWith(href.replace(/\/$/, ""));

        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center gap-1 ${
              isActive ? "text-white" : "text-gray-400"
            }`}
          >
            <Icon size={24} />
            {isActive && (
              <div className="absolute bottom-[-15px] w-6 h-2 bg-red-500 rounded-full blur-[6px]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
