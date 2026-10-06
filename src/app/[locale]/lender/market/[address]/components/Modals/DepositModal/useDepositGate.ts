import { useEffect, useState } from "react"

export type UseDepositGateInput = {
  required: boolean
  isModalOpen: boolean
}

export type UseDepositGateResult = {
  gateActive: boolean
  acknowledged: boolean
  setAcknowledged: (next: boolean) => void
  accept: () => void
  reset: () => void
}

export const useDepositGate = ({
  required,
  isModalOpen,
}: UseDepositGateInput): UseDepositGateResult => {
  const [acknowledged, setAcknowledged] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!isModalOpen) {
      setAcknowledged(false)
      setAccepted(false)
    }
  }, [isModalOpen])

  return {
    gateActive: required && !accepted,
    acknowledged,
    setAcknowledged,
    accept: () => setAccepted(true),
    reset: () => {
      setAcknowledged(false)
      setAccepted(false)
    },
  }
}
