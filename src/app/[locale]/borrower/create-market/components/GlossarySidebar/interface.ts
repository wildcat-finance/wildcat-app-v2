import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

export type GlossaryItem = {
  title: string
  description: string
}

export type GlossarySidebarProps = {
  hideGlossary?: boolean
  items?: GlossaryItem[]
  marketType?: string
  step?: CreateMarketSteps
}
