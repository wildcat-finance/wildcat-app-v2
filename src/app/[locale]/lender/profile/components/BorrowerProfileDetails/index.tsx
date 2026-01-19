"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Button, Divider, SvgIcon } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { MarketsSection } from "@/app/[locale]/borrower/profile/components/MarketsSection"
import { NameSection } from "@/app/[locale]/borrower/profile/components/NameSection"
import { OverallSection } from "@/app/[locale]/borrower/profile/components/OverallSection"
import { ProfileSkeleton } from "@/app/[locale]/borrower/profile/components/ProfileSkeleton"
import { useGetBorrowerProfile } from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import { Footer } from "@/components/Footer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { pageCalcHeights } from "@/utils/constants"
import { trimAddress } from "@/utils/formatters"

import { BorrowerProfileDetailsProps } from "./interface"
import { MainContainer } from "./style"

export function BorrowerProfileDetails({
  address,
  hideMarkets,
  sx,
}: BorrowerProfileDetailsProps) {
  const isMobile = useMobileResolution()
  const [section, setSection] = useState<"markets" | "info">("markets")

  const handleChangeSection = (sectionTab: "markets" | "info") => {
    setSection(sectionTab)
  }

  const pathname = usePathname()

  const backLink = pathname.includes(ROUTES.borrower.profile)
    ? ROUTES.borrower.root
    : ROUTES.lender.root

  const { data: profileData, isLoading: isProfileLoading } =
    useGetBorrowerProfile(address as `0x${string}`)
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets(address as `0x${string}`)

  const marketsAmount = borrowerMarkets?.filter((market) => !market.isClosed)
    .length

  const isLoading = isMarketsLoading || isProfileLoading

  useEffect(() => {
    if (marketsAmount === 0) {
      setSection("info")
    } else {
      setSection("markets")
    }
  }, [marketsAmount])

  if (isLoading && !isMobile)
    return (
      <ProfileSkeleton
        type="external"
        rootSx={{
          width: "69.88%",
          margin: "0 auto 0 0",
          padding: "52px 20px 24px 44px",
          overflow: "scroll",
          height: `calc(100vh - ${pageCalcHeights.page})`,
        }}
      />
    )

  if (isMobile)
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            backgroundColor: COLORS.white,
            borderRadius: "14px",
            padding: "12px 16px",
          }}
        >
          <Link
            href={backLink}
            style={{ display: "flex", width: "fit-content", marginTop: "4px" }}
          >
            <SvgIcon
              sx={{ fontSize: "20px", "& path": { fill: COLORS.greySuit } }}
            >
              <Arrow />
            </SvgIcon>
          </Link>

          <NameSection
            type="external"
            {...profileData}
            name={profileData?.name || trimAddress(address)}
            marketsAmount={marketsAmount}
          />

          {marketsAmount !== 0 && <Divider sx={{ margin: "20px 0" }} />}

          {marketsAmount !== 0 && (
            <Box sx={{ width: "100%", display: "flex", gap: "4px" }}>
              <Button
                onClick={() => handleChangeSection("markets")}
                sx={{
                  padding: "6px 12px",
                  height: "32px",
                  width: "100%",
                  backgroundColor:
                    section === "markets" ? COLORS.whiteSmoke : "transparent",
                  color: COLORS.blackRock,
                }}
              >
                Active Markets
              </Button>
              <Button
                onClick={() => handleChangeSection("info")}
                sx={{
                  padding: "6px 12px",
                  height: "32px",
                  width: "100%",
                  backgroundColor:
                    section === "info" ? COLORS.whiteSmoke : "transparent",
                  color: COLORS.blackRock,
                }}
              >
                Overall Info
              </Button>
            </Box>
          )}
        </Box>

        {section === "markets" && (
          <MarketsSection markets={borrowerMarkets} isLoading={isLoading} />
        )}
        {section === "info" && (
          <OverallSection {...profileData} marketsAmount={marketsAmount} />
        )}

        <Box sx={{ marginTop: "auto" }}>
          <Footer showFooter={false} showDivider={false} />
        </Box>
      </Box>
    )

  return (
    <Box sx={sx}>
      <Box sx={MainContainer}>
        <NameSection
          type="external"
          {...profileData}
          name={profileData?.name || trimAddress(address)}
          marketsAmount={marketsAmount}
        />

        <OverallSection
          {...profileData}
          marketsAmount={marketsAmount}
          // totalBorrowedAmount="0"
          // defaults="0"
        />

        <Divider sx={{ margin: "32px 0", borderColor: "transparent" }} />

        {!hideMarkets && marketsAmount !== 0 && (
          <MarketsSection markets={borrowerMarkets} isLoading={isLoading} />
        )}
      </Box>
    </Box>
  )
}
