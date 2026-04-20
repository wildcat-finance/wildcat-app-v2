"use client"

import { Box, SvgIcon, Tooltip, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type ExploreMarketCardItem = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string | undefined
  debt: TokenAmount | undefined
  asset: string
  apr: number
  withdrawalBatchDuration: number
  chainId?: number
}

export const ExploreMarketCard = ({
  marketItem,
  isLast = false,
}: {
  marketItem: ExploreMarketCardItem
  isLast?: boolean
}) => {
  const router = useRouter()

  const adsCellProps = getAdsCellProps(marketItem.id)
  const adsComponent = adsCellProps
    ? getAdsTooltipComponent(marketItem.id, formatBps(marketItem.apr))
    : undefined

  return (
    <Box
      onClick={() =>
        router.push(buildMarketHref(marketItem.id, marketItem.chainId))
      }
      sx={{
        width: "100%",
        backgroundColor: COLORS.white,
        padding: "12px 8px",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.athensGrey}`,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        cursor: "pointer",
      }}
    >
      {/* Status + Term */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <MarketStatusChip status={marketItem.status} withPeriod={false} />
        <MarketTypeChip type="table" {...marketItem.term} isMobile />
      </Box>

      {/* Name/Borrower + Debt/Metadata */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: "4px",
        }}
      >
        <Box
          sx={{
            flex: "1 0 0",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            minWidth: 0,
          }}
        >
          <Typography
            variant="mobText2"
            sx={{
              color: COLORS.blackRock,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {marketItem.name}
          </Typography>

          {marketItem.borrowerAddress ? (
            <Link
              href={`${ROUTES.lender.profile}/${marketItem.borrowerAddress}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                width: "fit-content",
                textDecoration: "none",
              }}
            >
              <BorrowerProfileChip
                borrower={marketItem.borrower ?? marketItem.borrowerAddress}
              />
            </Link>
          ) : (
            <BorrowerProfileChip
              borrower={marketItem.borrower ?? marketItem.borrowerAddress}
            />
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            alignItems: "flex-end",
            flexShrink: 0,
          }}
        >
          <Typography
            variant="mobText3"
            sx={{ color: COLORS.blackRock, whiteSpace: "nowrap" }}
          >
            {marketItem.debt
              ? formatTokenWithCommas(marketItem.debt, {
                  withSymbol: false,
                  fractionDigits: 2,
                })
              : "0"}{" "}
            {marketItem.asset}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              variant="mobText4"
              sx={{ color: "#28CA7C", whiteSpace: "nowrap" }}
            >
              {formatBps(marketItem.apr)}%
            </Typography>

            <Typography
              variant="mobText4"
              sx={{ color: COLORS.blackRock, mx: "2px" }}
            >
              ・
            </Typography>

            <Typography
              variant="mobText4"
              sx={{ color: COLORS.blackRock, whiteSpace: "nowrap" }}
            >
              {formatSecsToHours(marketItem.withdrawalBatchDuration, true)}
            </Typography>

            {adsCellProps && (
              <>
                <Typography
                  variant="mobText4"
                  sx={{ color: COLORS.blackRock, mx: "2px" }}
                >
                  ・
                </Typography>
                <Tooltip
                  placement="bottom-end"
                  arrow={false}
                  title={adsComponent}
                  componentsProps={{
                    tooltip: {
                      sx: {
                        p: 0,
                        bgcolor: "transparent",
                        boxShadow: "none",
                        borderRadius: 0,
                        maxWidth: "none",
                      },
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      "& .stacked-icon:not(:first-of-type)": { ml: "-4px" },
                    }}
                  >
                    {adsCellProps.icons.map((icon, idx) => (
                      <SvgIcon
                        key={icon.key ?? idx}
                        className="stacked-icon"
                        sx={{ fontSize: "14px" }}
                      >
                        {icon}
                      </SvgIcon>
                    ))}
                  </Box>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
