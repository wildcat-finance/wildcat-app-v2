export type BaseProps = {
  description: React.ReactNode
  unread: boolean
  error: boolean
  action?: {
    label: string
    onClick: () => void
  }
  date: string
  children?: React.ReactNode
}
