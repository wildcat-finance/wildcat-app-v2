import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Divider } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetServiceAgreementStatus } from "@/app/[locale]/borrower/hooks/useGetServiceAgreementStatus"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import { BorrowerDefaultNotice } from "@/components/DefaultNotice"
import { Footer } from "@/components/Footer"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useDefaultedMarkets } from "@/hooks/useDefaultedMarkets"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { trimAddress } from "@/utils/formatters"

import { MarketsBlock } from "./components/MarketsBlock"
import { MobileNamePageBlockWrapper } from "./components/MobileNamePageBlockWrapper"
import { ProfilePageSkeleton } from "./components/PageSkeleton"
import { ProfileNamePageBlock } from "./components/ProfileNamePageBlock"
import { ProfilePageProps } from "./interface"
import {
  DefaultNoticeContainer,
  MobileContentContainer,
  MobileDefaultNoticeContainer,
  PageContentContainer,
} from "./style"
import { OverallBlock } from "../components/OverallBlock"
import { ToUStatusBlock } from "../components/ToUStatusBlock"
import { BorrowerProfileVerificationDisclosure } from "../components/VerificationDisclosure"

export const ProfilePage = ({ type, profileAddress }: ProfilePageProps) => {
  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(profileAddress)

  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(profileAddress)

  // Fired here (not inside ToUStatusBlock) so the request runs in parallel with
  // the profile/markets fetches instead of starting after the page's load gate.
  const { data: touStatus, isLoading: isTouStatusLoading } =
    useGetServiceAgreementStatus(profileAddress)

  const isMobile = useMobileResolution()

  const isExternal = type === "external"
  const isLoading = isMarketsLoading || isProfileLoading
  const activeMarkets = borrowerMarkets?.filter((market) => !market.isClosed)
  const marketsAmount = (activeMarkets ?? []).length
  const { chainId: currentChainId } = useCurrentNetwork()
  const {
    isLoading: isDefaultsLoading,
    isError: isDefaultsError,
    isDefaulted,
    defaultedMarketsOfBorrower,
  } = useDefaultedMarkets(currentChainId)
  const defaults =
    isDefaultsLoading || isDefaultsError
      ? undefined
      : defaultedMarketsOfBorrower(profileAddress).length
  const listedMarkets = borrowerMarkets?.filter(
    (market) => !market.isClosed || isDefaulted(market.address),
  )
  const listedMarketsAmount = (listedMarkets ?? []).length
  const hasListedMarkets = listedMarketsAmount > 0
  const showDefaultNotice = isExternal && !!defaults
  const accountName = profileData?.name ?? trimAddress(profileAddress as string)

  // Mobile
  const [section, setSection] = useState<"markets" | "info">("markets")

  useEffect(() => {
    setSection(hasListedMarkets ? "markets" : "info")
  }, [hasListedMarkets])

  if (isLoading || isDefaultsLoading)
    return <ProfilePageSkeleton isExternal={isExternal} isMobile={isMobile} />

  if (isMobile)
    return (
      <Box sx={MobileContentContainer}>
        {showDefaultNotice && (
          <Box sx={MobileDefaultNoticeContainer}>
            <BorrowerDefaultNotice />
          </Box>
        )}

        <BorrowerProfileVerificationDisclosure showNote={false} />

        <MobileNamePageBlockWrapper
          section={section}
          setSection={setSection}
          marketsAmount={listedMarketsAmount}
        >
          <ProfileNamePageBlock
            {...profileData}
            name={accountName}
            marketsAmount={listedMarketsAmount}
            isExternal={isExternal}
            isMobile={isMobile}
          />
        </MobileNamePageBlockWrapper>

        {section === "markets" && (
          <MarketsBlock
            markets={listedMarkets}
            isLoading={isLoading}
            isDefaulted={isDefaulted}
          />
        )}

        {section === "info" && (
          <>
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
          </>
        )}

        <Box sx={{ marginTop: "auto" }}>
          <Footer showFooter={false} showDivider={false} />
        </Box>
      </Box>
    )

  return (
    <Box sx={PageContentContainer}>
      {showDefaultNotice && (
        <Box sx={DefaultNoticeContainer}>
          <BorrowerDefaultNotice />
        </Box>
      )}

      <ProfileNamePageBlock
        {...profileData}
        name={accountName}
        marketsAmount={listedMarketsAmount}
        isExternal={isExternal}
        isMobile={isMobile}
      />

      <Divider sx={{ marginY: "32px" }} />

      <Box sx={{ position: "relative" }}>
        <OverallBlock
          {...profileData}
          marketsAmount={marketsAmount}
          defaults={defaults}
          isPage
        />

        <BorrowerProfileVerificationDisclosure />
      </Box>

      <Divider sx={{ marginY: "32px" }} />

      <ToUStatusBlock
        address={profileAddress}
        status={touStatus}
        isLoading={isTouStatusLoading}
        isPage
      />

      {listedMarketsAmount !== 0 && (
        <MarketsBlock
          markets={listedMarkets}
          isLoading={isLoading}
          isDefaulted={isDefaulted}
        />
      )}
    </Box>
  )
}
