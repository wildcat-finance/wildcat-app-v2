export type MarketParametersItemProps = {
  title: string
  value: string | number
  tooltipText?: string
  valueTooltipText?: string
  alarmState?: boolean
  handleCopy?: () => void
  link?: string
}
