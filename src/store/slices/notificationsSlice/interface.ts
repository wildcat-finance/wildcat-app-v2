export type TNotification = {
  description: string
  type: "borrowerRegistrationChange"
  category: "marketActivity" | "newLenders"
  date: string
  unread: boolean
  error?: boolean
  data?: object
  action?: {
    label: string
    onClick: () => void
  }
}

export type TNotifications = Array<TNotification>
