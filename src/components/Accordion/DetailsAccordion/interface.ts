import { Dispatch, ReactNode, SetStateAction } from "react"

export type DetailsAccordionProps = {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  summaryText: string
  arrowOnRight?: boolean
  iconColor?: string
  summarySx?: object
  chipValue?: string
  bodySx?: object
  children: ReactNode
}
