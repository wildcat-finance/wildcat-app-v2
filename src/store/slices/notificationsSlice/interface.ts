interface TBaseNotification {
  description: React.ReactNode
  date: string
  unread: boolean
  error?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface TBorrowerRegistrationChangeNotification extends TBaseNotification {
  type: "borrowerRegistrationChange"
  category: "marketActivity"
  data?: undefined
}

interface TAprDecreaseEndedNotification extends TBaseNotification {
  type: "aprDecreaseEnded"
  category: "marketActivity"
  data: {
    apr: string
    newApr: string
    percentageIncrease: number
  }
}

interface TLenderAddedNotification extends TBaseNotification {
  type: "lenderAdded"
  category: "newLenders"
  data?: undefined
}

interface TLenderRemovedNotification extends TBaseNotification {
  type: "lenderRemoved"
  category: "marketActivity"
  data?: undefined
}

interface TWithdrawalStartedNotification extends TBaseNotification {
  type: "withdrawalStarted"
  category: "marketActivity"
  data: {
    timeRemaining: number
  }
}

interface TWithdrawalSuccessNotification extends TBaseNotification {
  type: "withdrawalSuccess"
  category: "marketActivity"
  data?: undefined
}

interface TLenderClaimedNotification extends TBaseNotification {
  type: "lenderClaimed"
  category: "marketActivity"
  data: {
    amount: number
    token: string
  }
}

interface TWithdrawalFailedNotification extends TBaseNotification {
  type: "withdrawalFailed"
  category: "marketActivity"
  data: {
    amount: number
    token: string
  }
}

interface TLoanTakenNotification extends TBaseNotification {
  type: "loanTaken"
  category: "marketActivity"
  data?: undefined
}

interface TLoanRepaidNotification extends TBaseNotification {
  type: "loanRepaid"
  category: "marketActivity"
  data?: undefined
}

export type TNotification =
  | TBorrowerRegistrationChangeNotification
  | TAprDecreaseEndedNotification
  | TLenderAddedNotification
  | TLenderRemovedNotification
  | TWithdrawalStartedNotification
  | TWithdrawalSuccessNotification
  | TLenderClaimedNotification
  | TWithdrawalFailedNotification
  | TLoanTakenNotification
  | TLoanRepaidNotification

export type TNotifications = Array<TNotification>
