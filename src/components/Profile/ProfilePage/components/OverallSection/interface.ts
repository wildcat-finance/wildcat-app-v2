import { BorrowerProfile } from "@/app/api/profiles/interface"

export type OverallSectionProps = Partial<BorrowerProfile> & {
  marketsAmount?: number
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
