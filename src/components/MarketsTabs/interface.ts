export type MarketsTabItem<T extends string> = {
  value: T
  label: string
  count?: number
}

export type MarketsTabsProps<T extends string> = {
  value: T
  items: MarketsTabItem<T>[]
  onChange: (value: T) => void
  hideCounts?: boolean
}
