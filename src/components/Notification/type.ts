export type NotificationProps = {
  type: "onboardSuccesful" | "onboardFailed",
  description: string,
  date: string,
  unread: boolean,
  error: boolean,
  data?: any,
  action?: {
    label: string,
    onClick: () => void,
  }
}