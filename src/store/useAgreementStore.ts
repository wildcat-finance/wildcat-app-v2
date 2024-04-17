import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AgreementStore = {
  setSlaSignature: (address: string, signature: string) => void
  setBorrowerSignature: (address: string, signature: string) => void
  [key: `sla-signature-${string}`]: string
  [key: `borrower-signature-${string}`]: string
}

export const useAgreementStore = create<AgreementStore>()(
  persist(
    (set) => ({
      setSlaSignature: (address: string, signature: string) =>
        set({
          [`sla-signature-${address.toLowerCase()}`]: signature,
        }),
      setBorrowerSignature: (address: string, signature: string) =>
        set({
          [`borrower-signature-${address.toLowerCase()}`]: signature,
        }),
    }),
    {
      name: "sla_signatures",
    },
  ),
)
