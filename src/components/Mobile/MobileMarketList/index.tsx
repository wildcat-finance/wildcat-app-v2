import React, { useState } from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { usePathname } from "next/navigation"

import { AurosEthenaMobileCard } from "@/components/AdsBanners/AurosEthena/AurosEthenaMobileCard"
import {
  LenderMobileMarketItem,
  MobileMarketCard,
} from "@/components/Mobile/MobileMarketCard"
} from "@/app/[locale]/lender/components/mobile/MobileMarketCard"
import { AurosEthenaMobileContent } from "@/components/AdsBanners/AurosEthena/AurosEthenaMobileContent"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { AUROS_ETHENA_ADDRESS } from "@/utils/constants"
import { formatBps } from "@/utils/formatters"

const ITEMS_PER_PAGE = 20

const getPaginationRange = (page: number, totalPages: number) => {
  const range: (number | "...")[] = []

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }

  range.push(0)

  if (page > 2) {
    range.push("...")
  }

  for (
    let i = Math.max(1, page - 1);
    i <= Math.min(totalPages - 2, page + 1);
    // eslint-disable-next-line no-plusplus
    i++
  ) {
    range.push(i)
  }

  if (page < totalPages - 3) {
    range.push("...")
  }

  range.push(totalPages - 1)

  return range
}

export const MobileMarketList = ({
  markets,
  isLoading,
}: {
  markets: LenderMobileMarketItem[]
  isLoading: boolean
}) => {
  const [page, setPage] = useState(0)
  const pathname = usePathname()

  const isBorrowerProfilePage = pathname.includes(ROUTES.borrower.profile)
  const isLenderProfilePage = pathname.includes(ROUTES.lender.profile)

  const showBorrowerInCard = !isBorrowerProfilePage && !isLenderProfilePage

  const totalPages = Math.ceil(markets.length / ITEMS_PER_PAGE)
  const startIndex = page * ITEMS_PER_PAGE
  const currentItems = markets.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handlePrev = () => setPage((prev) => Math.max(prev - 1, 0))
  const handleNext = () => setPage((prev) => Math.min(prev + 1, totalPages - 1))

  const paginationItems = getPaginationRange(page, totalPages)

  const getAdsContent = (marketItem: LenderMobileMarketItem) => {
    if (
      marketItem.id.toLowerCase() ===
        AUROS_ETHENA_ADDRESS.testnet.toLowerCase() ||
      marketItem.id.toLowerCase() === AUROS_ETHENA_ADDRESS.mainnet.toLowerCase()
    ) {
      return <AurosEthenaMobileContent baseAPR={formatBps(marketItem.apr)} />
    }
    return undefined
  }

  if (!markets.length && !isLoading)
    return (
      <Box
        sx={{
          width: "100%",
          height: "155px",
          backgroundColor: COLORS.white,
          padding: "12px",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          marginTop: "4px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="mobH3">No Markets Here</Typography>
        <Typography variant="mobText3" color={COLORS.santasGrey}>
          Change selected filters or check other sections
        </Typography>
      </Box>
    )

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        marginTop: "4px",
      }}
    >
      <Box
        sx={{
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {!isLoading &&
          currentItems.map((marketItem) => (
            <MobileMarketCard
              adsComponent={getAdsContent(marketItem)}
              key={marketItem.id}
              marketItem={marketItem}
              buttonText="Deposit"
              buttonIcon
              showBorrower={showBorrowerInCard}
            />
          ))}
        {isLoading && (
          <>
            <Skeleton
              sx={{
                width: "100%",
                height: "155px",
                backgroundColor: COLORS.white06,
                borderRadius: "14px",
              }}
            />
            <Skeleton
              sx={{
                width: "100%",
                height: "155px",
                backgroundColor: COLORS.white06,
                borderRadius: "14px",
              }}
            />
            <Skeleton
              sx={{
                width: "100%",
                height: "155px",
                backgroundColor: COLORS.white06,
                borderRadius: "14px",
              }}
            />
          </>
        )}
      </Box>

      {!isLoading && ITEMS_PER_PAGE < markets.length && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 12px 16px",
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handlePrev}
            disabled={page === 0}
            sx={{
              minWidth: "fit-content",
              "&.Mui-disabled": {
                backgroundColor: COLORS.white03,
                color: COLORS.white,
              },
              padding: "6px 14px",
              borderRadius: "8px",
            }}
          >
            Prev
          </Button>

          <Box sx={{ display: "flex", gap: "8px" }}>
            {paginationItems.map((item) => {
              if (item === "...") {
                return (
                  <Box
                    key={`ellipsis-${item}`}
                    sx={{
                      width: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: COLORS.white,
                      fontSize: "14px",
                    }}
                  >
                    ...
                  </Box>
                )
              }

              return (
                <Button
                  key={item}
                  onClick={() => setPage(item)}
                  sx={{
                    minWidth: "24px !important",
                    width: "24px !important",
                    padding: "2px !important",
                    borderRadius: "8px",
                    backgroundColor:
                      item === page ? COLORS.white03 : "transparent",

                    "&:hover": {
                      backgroundColor: COLORS.white03,
                    },
                  }}
                >
                  <Typography variant="text3" color={COLORS.white}>
                    {item + 1}
                  </Typography>
                </Button>
              )
            })}
          </Box>

          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleNext}
            disabled={page === totalPages - 1}
            sx={{
              minWidth: "fit-content",
              "&.Mui-disabled": {
                backgroundColor: COLORS.white03,
                color: COLORS.white,
              },
              padding: "6px 14px",
              borderRadius: "8px",
            }}
          >
            Next
          </Button>
        </Box>
      )}
    </Box>
  )
}
