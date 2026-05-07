import { create } from "zustand";
import { getValueState } from "@common";
import { GetStatesZustand } from "@types";

type States = GetStatesZustand<{
  pdfUri: string;
}>;

export const usePDFStore = create<States>()((set, get) => {
  const value: States = {
    pdfUri: "",
    setPdfUri: (v) => set({ pdfUri: getValueState(v, () => get().pdfUri) }),
  };

  return value;
});
