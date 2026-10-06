"use client"

import * as React from "react"

import { Box, Divider } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"

import { useGetServiceAgreementStatus } from "@/app/[locale]/borrower/hooks/useGetServiceAgreementStatus"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { trimAddress } from "@/utils/formatters"
import { countMarketsInDefault } from "@/utils/marketStatus"

import { OverallBlock } from "../../../components/OverallBlock"
import { ToUStatusBlock } from "../../../components/ToUStatusBlock"
import { BorrowerProfileVerificationDisclosure } from "../../../components/VerificationDisclosure"
import { ProfileNamePageBlock } from "../ProfileNamePageBlock"

type LegalInfoTabProps = {
  profileAddress?: `0x${string}`
  chainId?: number
  type: "external" | "internal"
  markets: Market[]
  isMobile: boolean
}

// The original (main-branch) borrower profile view — identity block, overall
// info block, and Terms-of-Use status — minus the Active Markets table,
// surfaced under the Legal Info tab.
export const LegalInfoTab = ({
  profileAddress,
  chainId,
  type,
  markets,
  isMobile,
}: LegalInfoTabProps) => {
  const { data: profileData } = useGetBorrowerProfile(profileAddress, chainId)
  const { data: touStatus, isLoading: isTouStatusLoading } =
    useGetServiceAgreementStatus(profileAddress, chainId)

  const accountName = profileData?.name ?? trimAddress(profileAddress ?? "")
  const marketsAmount = markets.filter((market) => !market.isClosed).length
  const defaults = countMarketsInDefault(markets)
  const isExternal = type === "external"

  if (isMobile) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <ProfileNamePageBlock
          {...profileData}
          name={accountName}
          marketsAmount={marketsAmount}
          isExternal={isExternal}
          isMobile
        />

        <OverallBlock
          {...profileData}
          marketsAmount={marketsAmount}
          defaults={defaults}
        />
        <BorrowerProfileVerificationDisclosure
          variant="inline"
          showModal={false}
        />

        <ToUStatusBlock
          address={profileAddress}
          status={touStatus}
          isLoading={isTouStatusLoading}
        />
      </Box>
    )
  }

  return (
    <Box>
      <ProfileNamePageBlock
        {...profileData}
        name={accountName}
        marketsAmount={marketsAmount}
        isExternal={isExternal}
        isMobile={false}
      />

      <Divider sx={{ marginY: "32px" }} />

      <Box sx={{ position: "relative" }}>
        <OverallBlock
          {...profileData}
          marketsAmount={marketsAmount}
          defaults={defaults}
          isPage
        />
        <BorrowerProfileVerificationDisclosure showModal={false} />
      </Box>

      <Divider sx={{ marginY: "32px" }} />

      <ToUStatusBlock
        address={profileAddress}
        status={touStatus}
        isLoading={isTouStatusLoading}
        isPage
      />
    </Box>
  )
}
