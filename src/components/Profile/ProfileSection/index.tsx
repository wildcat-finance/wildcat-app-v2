import * as React from "react"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"

import { ProfileSectionNameBlock } from "./components/ProfileSectionNameBlock"
import { ProfileSectionProps } from "./interface"
import { OverallBlock } from "../components/OverallBlock"

export const ProfileSection = ({ profileAddress }: ProfileSectionProps) => {
  const { data: profileData } = useGetBorrowerProfile(profileAddress)
  const { data: borrowerMarkets } = useGetBorrowerMarkets(profileAddress)

  const activeMarkets = borrowerMarkets?.filter((market) => !market.isClosed)
  const marketsAmount = (activeMarkets ?? []).length

  return (
    <>
      <ProfileSectionNameBlock {...profileData} />

      <OverallBlock {...profileData} marketsAmount={marketsAmount} />
    </>
  )
}
