"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import BackgroundImgBlur from "@/component/BackgroundBlur";

interface Player {
  name: string;
  tokens: number;
  gamesPlayed: number;
  gamesWon: number;
  image?: string; // Image might be missing
}

const PlayersList: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    fetch("/players.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch players.json (Status: ${res.status})`);
        }
        return res.json();
      })
      .then((data) => setPlayers(data))
      .catch((error) => console.error("Fetch error:", error));
  }, []);

  // Calculate win percentage and sort players
  const rankedPlayers = players
    .map((player) => ({
      ...player,
      winPercentage: player.gamesPlayed
        ? (player.gamesWon / player.gamesPlayed) * 100
        : 0,
    }))
    .sort((a, b) => b.winPercentage - a.winPercentage);

  return (
    <BackgroundImgBlur>
      {/* <div className="w-full h-screen flex flex-col items-center bg-[#030B1F] p-16 box-border"> */}
      
      <div className="w-full h-screen flex flex-col items-center bg-[#030B1F] p-16 ">
        
        {/* Sticky Title */}
        <div className="w-70 max-w-4xl bg-[#030B1F] text-white text-2xl font-bold text-center py-4 sticky top-0 z-50">
       
        {/* <div className="w-70 bg-[#030B1F] text-white text-2xl font-bold text-center py-3 z-50 sticky top-0"> */}
          Best Players Rankings
        </div>

        {/* Scrollable Table Container */}
        {/* <div className="w-full max-w-4xl flex-1 min-h-0 overflow-y-auto"> */}
       
        <div className="w-full max-w-4xl flex-1 overflow-y-auto max-h-[80vh]">
          <table className="w-full">
            <tbody>
              {rankedPlayers.map((player, index) => (
                <tr key={player.name} className="text-white text-sm h-16">
                  {/* Column 1: Rank */}
                  <td className="text-center w-16">{index + 1}</td>

                  {/* Column 2: Player Image */}
                  <td className="w-20">
                    <Image
                      src={player.image || "/images/placeholder.jpg"}
                      alt={player.name}
                      className="w-12 h-12 rounded-full border-2 border-yellow-700 object-cover"
                      width={48}
                      height={48}
                      unoptimized
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/placeholder.jpg";
                      }}
                    />
                  </td>

                  {/* Column 3: Name + Tokens */}
                  <td className="pl-4">
                    <div className="font-bold">{player.name}</div>
                    <div className="text-[11px] italic">
                      <span className="text-white font-bold">Token won</span>
                      <span className="text-gray-400 ml-1">{player.tokens}</span>
                    </div>
                  </td>

                  {/* Column 4: Games Played + Games Won */}
                  <td className="pl-2 text-xs text-right leading-tight">
                    <div>
                      <span className="text-gray-400 font-bold">Played</span>
                      <span className="text-white ml-1">{player.gamesPlayed}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-gray-400 font-bold">Wins</span>
                      <span className="text-white ml-1">{player.gamesWon}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
      </div>
    </BackgroundImgBlur>
  );
};

export default PlayersList;
