export type ParametersItemProps = {
  title: string
  value: string | number
  valueComponent?: React.ReactNode
  tooltipText?: string
  valueTooltipText?: string
  // Hover title shown on the value text (e.g. the raw string behind a pretty label)
  valueTitle?: string
  alarmState?: boolean
  copy?: string
  link?: string
}
