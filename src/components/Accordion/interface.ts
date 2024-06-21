import { ReactNode } from "react"

export type AccordionProps = {
  title: string
  children: ReactNode
  arrowRight?: boolean
  sx?: object
}
