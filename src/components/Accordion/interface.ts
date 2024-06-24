import { ReactNode } from "react"

export type AccordionProps = {
  title: string
  children: ReactNode
  arrowRight?: boolean
  sx?: object
  summarySx?: object
  iconContainerSx?: object
  iconColor?: string
  chipValue?: string
}
