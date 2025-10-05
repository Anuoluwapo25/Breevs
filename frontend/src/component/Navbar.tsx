"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gamepad2, BarChart2, Wallet } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/Home", icon: Home },
    { href: "/GameScreen", icon: Gamepad2 },
    { href: "/LeaderBoard", icon: BarChart2 },
    { href: "/Wallet", icon: Wallet },
  ];

  // const navItems = [
  //   { href: "/home", icon: Home },
  //   { href: "/gamescreen", icon: Gamepad2 },
  //   { href: "/leaderboard", icon: BarChart2 },
  //   { href: "/wallet", icon: Wallet },
  // ];

  return (
    <nav className="fixed bottom-0 w-full bg-[#121232] p-4 flex justify-around text-white">
      {navItems.map(({ href, icon: Icon }) => {
        const isActive = pathname === href;

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
