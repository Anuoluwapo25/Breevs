"use client";

import { ReactNode } from "react";
import Man from "../assets/RR_LOGO_1.png";

interface BackgroundImgProps {
  children: ReactNode;
}

const BackgroundImg: React.FC<BackgroundImgProps> = ({ children }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative h-screen w-screen bg-[#030B1F]">
      <div
        className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-12"
        style={{ backgroundImage: `url(${Man.src})` }}
      ></div>
      {children}
    </div>
  );
};

export default BackgroundImg;
