export type BaseProps = {
  description: string
  unread: boolean
  error: boolean
  action?: {
    label: string
    onClick: () => void
  }
  date: string
}
