export interface PollingRegistrationProps {
  address?: string
}

export type TBorrowerRegistrationChange = {
  isRegistered: boolean
  blockTimestamp: number
  transactionHash: string
}

export type TReserveRatioBipsUpdated = {
  newReserveRatioBips: number
  oldReserveRatioBips: number
  blockTimestamp: number
  transactionHash: string
  market: {
    name: string
    symbol: string
  }
}
