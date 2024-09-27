export type TNotifications = Array<{
  description: string,
  type: "onboardSuccesful" | "onboardFailed",
  category: "marketActivity" | "newLenders",
  date: string,
  unread: boolean,
  error: boolean,
  data?: any,
  action?: {
    label: string,
    onClick: () => void,
  }
}>