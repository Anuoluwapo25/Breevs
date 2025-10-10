export const mapContractError = (
  error: any
): { code: number; message: string } => {
  const code = error?.error?.code || 0;
  switch (code) {
    case 100:
      return { code, message: "Game is full" };
    case 401:
      return { code, message: "Unauthorized action" };
    case 402:
      return { code, message: "Invalid game state" };
    case 403:
      return { code, message: "Round has expired" };
    case 404:
      return { code, message: "Insufficient balance or game not found" };
    case 405:
      return { code, message: "Player already eliminated" };
    case 406:
      return { code, message: "Invalid stake amount" };
    case 407:
      return { code, message: "Invalid round duration" };
    case 408:
      return { code, message: "Only the winner can claim the prize" };
    case 409:
      return { code, message: "Prize already claimed" };
    case 410:
      return { code, message: "No winner found" };
    case 411:
      return { code, message: "Only the game creator can perform this action" };
    case 412:
      return { code, message: "Round is still active" };
    case 413:
      return { code, message: "Minimum host balance not met" };
    default:
      return {
        code,
        message:
          error instanceof Error
            ? error.message.includes("stx-transfer")
              ? "Failed to transfer STX. Check your balance."
              : error.message
            : "Unknown error occurred",
      };
  }
};
