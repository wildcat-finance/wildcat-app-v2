"use client"

import dynamic from "next/dynamic"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { analyticsUiEnabled } from "@/config/featureFlags"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

import { ProfileSectionNameBlock } from "./components/ProfileSectionNameBlock"
import type { ProfileSectionProps } from "./interface"
import { OverallBlock } from "../components/OverallBlock"
import { BorrowerProfileVerificationDisclosure } from "../components/VerificationDisclosure"

const CoreProfileSection = ({
  profileAddress,
  externalChainId,
}: ProfileSectionProps) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const { data: profileData } = useGetBorrowerProfile(profileAddress, chainId)
  const { data: borrowerMarkets } = useGetBorrowerMarkets(
    profileAddress,
    chainId,
  )

  const activeMarkets = borrowerMarkets?.filter((market) => !market.isClosed)
  const marketsAmount = (activeMarkets ?? []).length

  return (
    <>
      <ProfileSectionNameBlock {...profileData} />

      <OverallBlock
        {...profileData}
        marketsAmount={marketsAmount}
        externalChainId={chainId}
      />

      <BorrowerProfileVerificationDisclosure variant="market" />
    </>
  )
}

const AnalyticsProfileSection = dynamic(
  () =>
    import("./AnalyticsProfileSection").then(
      (module) => module.AnalyticsProfileSection,
    ),
  { ssr: false },
)

export const ProfileSection = (props: ProfileSectionProps) =>
  analyticsUiEnabled ? (
    <AnalyticsProfileSection {...props} />
  ) : (
    <CoreProfileSection {...props} />
  )
