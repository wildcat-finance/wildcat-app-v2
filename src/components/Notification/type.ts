export type NotificationProps = {
  type: "borrowerRegistrationChange"
  description: string
  date: string
  unread: boolean
  error: boolean
  data?: any
  action?: {
    label: string
    onClick: () => void
  }
}
