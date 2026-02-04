import { BorrowerProfile } from "@/app/api/profiles/interface"

export type OverallBlockProps = Partial<BorrowerProfile> & {
  marketsAmount?: number
  externalChainId?: number
  defaults?: string
  isPage?: boolean
}

export type ProfileItem = {
  title: string
  value: string | number | undefined
  tooltipText?: string
  link?: string
  copy?: string
}
