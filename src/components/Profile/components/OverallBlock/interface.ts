import { BorrowerProfile } from "@/app/api/profiles/interface"

export type ProfileItem = {
  title: string
  value: string | number | undefined
  tooltipText?: string
  link?: string
  copy?: string
}

export type OverallBlockProps = Partial<BorrowerProfile> & {
  marketsAmount?: number
  externalChainId?: number
  defaults?: string
  borrowed?: string
  extraItems?: ProfileItem[]
  isPage?: boolean
}
