"use client";

import Modal from "@/component/ResuableModal";
import GlowingEffect from "@/component/GlowingEffectProps";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAccount } from "@micro-stacks/react";
import { useCreateGame } from "@/hooks/useGame";

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateGameModal: React.FC<CreateGameModalProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { stxAddress } = useAccount();

  const { mutateAsync: createGame } = useCreateGame();

  const [stake, setStake] = useState("0.1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [showManualProceed, setShowManualProceed] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleCreateGame = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setTxId(null);
      setShowManualProceed(false);

      if (!isSignedIn || !stxAddress) {
        setError("⚠ Please connect your Stacks wallet first");
        setIsProcessing(false);
        return;
      }

      // Convert to bigint
      const stakeBigInt = BigInt(Math.floor(Number(stake) * 1_000_000));
      const durationBigInt = BigInt(600);

      // Call Clarity function
      await createGame({ stake: stakeBigInt, duration: durationBigInt });

      // You can listen for transaction via Stacks API or redirect user
      setTxId("pending...");
      onClose();
      router.push("/GameScreen/1");
    } catch (err) {
      console.error("Create game error:", err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to create game");
        setIsProcessing(false);
      }
    }
  };

  // const handleManualProceed = () => {
  //   onClose();
  //   router.push("/GameScreen");
  // };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsProcessing(false);
      setTxId(null);
      setShowManualProceed(false);
      setStake("0.1");
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-[#0B1445] text-white text-center p-6 rounded-2xl">
        <GlowingEffect className="top-[63px] left-[47px]" />
        <h2 className="text-[25px] font-bold mb-4">Create New Game Room</h2>

        <p className="text-md mb-2 text-[#FF3B3B]">Set Stake Amount</p>
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            min="0.000001"
            step="0.1"
            className="w-full bg-transparent text-white text-center text-xl focus:outline-none"
            placeholder="0.1"
          />
          <p className="text-sm text-gray-400 mt-2">STX</p>
        </div>

        <p className="text-sm mb-4">
          You are about to create a game room with a stake of{" "}
          <span className="text-red-500 font-bold">{stake} STX</span>. Players
          will need to match this amount to join.
        </p>

        {txId && (
          <p className="text-blue-400 text-xs mb-2">Transaction: {txId}</p>
        )}

        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        {!isSignedIn && (
          <p className="text-yellow-400 text-sm mb-2">
            Please connect your wallet to proceed
          </p>
        )}

        {showManualProceed && (
          <div className="mb-4 p-3 bg-yellow-900 rounded-lg">
            <p className="text-yellow-300 text-sm mb-2">
              Transaction is taking longer than expected. If your transaction
              was confirmed in your wallet, you can proceed manually.
            </p>
            <button
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-4 rounded text-sm"
              //onClick={handleManualProceed}
            >
              Proceed to Game
            </button>
          </div>
        )}

        <button
          className={`bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full w-full 
            shadow-[0_4px_0_#474d76] hover:shadow-[0_4px_0_#474d76] active:translate-y-1 transition-all mt-6
            ${isProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
          onClick={handleCreateGame}
          disabled={isProcessing || !isSignedIn}
        >
          {isProcessing ? "Processing..." : "Create Game Room"}
        </button>
      </div>
    </Modal>
  );
};

export default CreateGameModal;
