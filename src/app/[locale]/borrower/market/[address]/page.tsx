"use client"

import * as React from "react"

import { Box, Divider, Fade, Skeleton } from "@mui/material"
import { useAccount } from "wagmi"

import { useBorrowerInvitationRedirect } from "@/app/[locale]/borrower/hooks/useBorrowerInvitationRedirect"
import { MarketStatusChart } from "@/app/[locale]/borrower/market/[address]/components/MarketStatusChart"
import { useGetMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useGetMarket"
import { LeadBanner } from "@/components/LeadBanner"
import { useGetMarketAccountForBorrowerLegacy } from "@/hooks/useGetMarketAccount"
import { COLORS } from "@/theme/colors"

import { MarketAuthorisedLenders } from "./components/MarketAuthorisedLenders"
import { MarketHeader } from "./components/MarketHeader"
import { MarketParameters } from "./components/MarketParameters"
import { MarketTransactions } from "./components/MarketTransactions"
import { MarketWithdrawalRequests } from "./components/MarketWithdrawalRequests"
import { SkeletonContainer, SkeletonStyle } from "./style"

export default function MarketDetails({
  params: { address },
}: {
  params: { address: string }
}) {
  const { data: market } = useGetMarket({
    address,
  })
  const { data: marketAccount } = useGetMarketAccountForBorrowerLegacy(market)

  const { address: walletAddress } = useAccount()

  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  const holdTheMarket =
    market?.borrower.toLowerCase() === walletAddress?.toLowerCase()

  const [checked, setChecked] = React.useState<number>(1)

  if (!market || !marketAccount)
    return (
      <Box sx={{ padding: "52px 20px 0 44px" }}>
        <Box sx={{ width: "69%" }}>
          <Box width="100%" height="90px">
            <Skeleton
              height="20px"
              width="132px"
              sx={{ bgcolor: COLORS.athensGrey }}
            />
          </Box>

          <Box sx={SkeletonContainer}>
            <Skeleton height="82px" width="395px" sx={SkeletonStyle} />

            <Skeleton height="82px" width="395px" sx={SkeletonStyle} />
          </Box>

          <Box
            sx={SkeletonContainer}
            marginTop="56px"
            flexDirection="column"
            gap="20px"
          >
            <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
            <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
            <Skeleton height="36px" width="100%" sx={SkeletonStyle} />
          </Box>
        </Box>
      </Box>
    )

  return (
    <Box sx={{ padding: "52px 20px 0 44px" }}>
      <Box sx={{ width: "69%" }}>
        {!bannerDisplayConfig.hideBanner && (
          <LeadBanner
            title={bannerDisplayConfig.title}
            text={bannerDisplayConfig.text}
            buttonText={bannerDisplayConfig.buttonText}
            buttonLink={bannerDisplayConfig.link}
          />
        )}

        <Box sx={{ position: "relative" }}>
          <Fade unmountOnExit in={checked === 1}>
            <Box
              sx={{
                width: "100%",
              }}
            >
              <MarketHeader
                marketAccount={marketAccount}
                holdTheMarket={holdTheMarket}
              />

              {holdTheMarket && <Divider sx={{ margin: "32px 0" }} />}

              {holdTheMarket && (
                <MarketTransactions
                  market={market}
                  marketAccount={marketAccount}
                />
              )}

              <Divider sx={{ margin: "32px 0 44px" }} />

              <MarketStatusChart market={market} />
            </Box>
          </Fade>

          <Fade unmountOnExit in={checked === 2}>
            <Box
              sx={{
                width: "100%",
              }}
            >
              <MarketStatusChart market={market} />

              <Divider sx={{ margin: "32px 0 44px" }} />

              <MarketParameters market={market} />
            </Box>
          </Fade>
          <Fade unmountOnExit in={checked === 3}>
            <Box
              sx={{
                width: "100%",
              }}
            >
              {holdTheMarket && (
                <MarketWithdrawalRequests marketAccount={marketAccount} />
              )}
            </Box>
          </Fade>
          <Fade unmountOnExit in={checked === 4}>
            <Box
              sx={{
                width: "100%",
              }}
            >
              {holdTheMarket && <MarketAuthorisedLenders market={market} />}
            </Box>
          </Fade>
        </Box>
      </Box>
    </Box>
  )
}
