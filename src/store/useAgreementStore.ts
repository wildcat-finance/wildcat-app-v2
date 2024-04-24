import { create } from "zustand"
import { persist } from "zustand/middleware"

export const SLA_SIGNATURE_KEY = "sla-signature"
export const BORROWER_SIGNATURE_KEY = "borrower-signature"
export const SLA_SIGNATURES_KEY = "sla_signatures"

export type AgreementStore = {
  setSlaSignature: (address: string, signature: string) => void
  setBorrowerSignature: (address: string, signature: string) => void
  [key: `${typeof SLA_SIGNATURE_KEY}-${string}`]: string
  [key: `${typeof BORROWER_SIGNATURE_KEY}-${string}`]: string
}

export const useAgreementStore = create<AgreementStore>()(
  persist(
    (set) => ({
      setSlaSignature: (address: string, signature: string) =>
        set({
          [`${SLA_SIGNATURE_KEY}-${address.toLowerCase()}`]: signature,
        }),
      setBorrowerSignature: (address: string, signature: string) =>
        set({
          [`${SLA_SIGNATURE_KEY}-${address.toLowerCase()}`]: signature,
        }),
    }),
    {
      name: SLA_SIGNATURES_KEY,
    },
  ),
)
