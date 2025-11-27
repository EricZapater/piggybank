import { useContext } from "react";

import { PiggyBankContext } from "@/context/PiggyBankContext";

export const usePiggyBank = () => {
  const context = useContext(PiggyBankContext);
  if (!context) {
    throw new Error("usePiggyBank must be used within a PiggyBankProvider");
  }
  return context;
};
