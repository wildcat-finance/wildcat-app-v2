export interface TNotification {
  description: React.ReactNode
  category: string
  blockTimestamp: number
  unread: boolean
  error?: boolean
  action?: {
    label: string
    onClick: () => void
  }
  etherscanUrl?: string
  children?: React.ReactNode
}

export type TNotifications = Array<TNotification>
