import * as React from "react"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"

import { ProfileSectionNameBlock } from "./components/ProfileSectionNameBlock"
import { ProfileSectionProps } from "./interface"
import { OverallBlock } from "../components/OverallBlock"
import { BorrowerProfileVerificationDisclosure } from "../components/VerificationDisclosure"

export const ProfileSection = ({
  profileAddress,
  externalChainId,
}: ProfileSectionProps) => {
  const { data: profileData } = useGetBorrowerProfile(
    profileAddress,
    externalChainId,
  )
  const { data: borrowerMarkets } = useGetBorrowerMarkets(
    profileAddress,
    externalChainId,
  )

  const activeMarkets = borrowerMarkets?.filter((market) => !market.isClosed)
  const marketsAmount = (activeMarkets ?? []).length

  return (
    <>
      <BorrowerProfileVerificationDisclosure variant="market" />

      <ProfileSectionNameBlock {...profileData} />

      <OverallBlock
        {...profileData}
        marketsAmount={marketsAmount}
        externalChainId={externalChainId}
      />
    </>
  )
}
