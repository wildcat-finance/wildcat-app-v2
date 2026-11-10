import React, { ReactNode, useState } from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { usePathname } from "next/navigation"

import type { Destination } from "@/lib/destinations/types"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { getPaginationRange } from "@/utils/pagination"

import { LenderMobileMarketItem, MobileMarketCard } from "../MobileMarketCard"

const DEFAULT_PAGE_SIZE = 20
const DEFAULT_SKELETON_COUNT = 3

const VARIANT_SX = {
  card: {
    marginTop: "4px",
    padding: "8px",
    borderRadius: "14px",
    backgroundColor: COLORS.white,
  },
  bare: {},
} as const

const RowsSx = {
  display: "flex",
  flexDirection: "column",
  "& > *:not(:last-child)": {
    borderBottom: `1px solid ${COLORS.whiteLilac}`,
  },
} as const

const PaginationArrowSx = {
  minWidth: "fit-content",
  "&.Mui-disabled": {
    backgroundColor: COLORS.white03,
    color: COLORS.white,
  },
  padding: "6px 14px",
  borderRadius: "8px",
} as const

export type MobileMarketListProps = {
  markets: readonly LenderMobileMarketItem[]
  isLoading?: boolean
  header?: ReactNode
  destinationsByMarket?: Record<string, Destination[]>
  emptyTitle?: string
  emptySubtitle?: string
  variant?: "card" | "bare"
  pageSize?: number
  resetKey?: string | number
  pagination?: boolean
  limit?: number
  emptyState?: ReactNode
  skeletonCount?: number
}

export const MobileMarketList = ({
  markets,
  isLoading = false,
  header,
  destinationsByMarket,
  emptyTitle = "No Markets Here",
  emptySubtitle = "Change selected filters or check other sections",
  variant = "card",
  pageSize = DEFAULT_PAGE_SIZE,
  resetKey,
  pagination = true,
  limit,
  emptyState,
  skeletonCount = DEFAULT_SKELETON_COUNT,
}: MobileMarketListProps) => {
  const pathname = usePathname()

  const [page, setPage] = useState(0)
  const [pageScope, setPageScope] = useState({ resetKey, pageSize })
  if (pageScope.resetKey !== resetKey || pageScope.pageSize !== pageSize) {
    setPageScope({ resetKey, pageSize })
    setPage(0)
  }

  const isBorrowerProfilePage = pathname.includes(ROUTES.borrower.profile)
  const isLenderProfilePage = pathname.includes(ROUTES.lender.profile)

  const showBorrowerInCard = !isBorrowerProfilePage && !isLenderProfilePage
  const baseRoute = isBorrowerProfilePage
    ? ROUTES.borrower.market
    : ROUTES.lender.market

  const totalPages = Math.ceil(markets.length / pageSize)
  const currentPage = Math.min(page, Math.max(0, totalPages - 1))
  const startIndex = currentPage * pageSize

  let currentItems = markets
  if (pagination) {
    currentItems = markets.slice(startIndex, startIndex + pageSize)
  } else if (limit !== undefined) {
    currentItems = markets.slice(0, limit)
  }

  const isEmpty = !markets.length && !isLoading
  const showPagination = pagination && !isLoading && markets.length > pageSize

  const handlePrev = () => setPage(Math.max(currentPage - 1, 0))
  const handleNext = () => setPage(Math.min(currentPage + 1, totalPages - 1))

  const paginationItems = getPaginationRange(currentPage, totalPages)

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          ...VARIANT_SX[variant],
        }}
      >
        {header}

        {isLoading && (
          <Box sx={RowsSx} aria-busy>
            {Array.from(
              { length: skeletonCount },
              (_, i) => `skeleton-${i}`,
            ).map((key) => (
              <Box key={key} sx={{ padding: "12px 8px" }}>
                <Skeleton
                  variant="rounded"
                  sx={{
                    width: "100%",
                    height: "106px",
                    borderRadius: "8px",
                    bgcolor: COLORS.athensGrey,
                  }}
                />
              </Box>
            ))}
          </Box>
        )}

        {isEmpty &&
          (emptyState ?? (
            <Box
              sx={{
                height: "155px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <Typography variant="mobH3">{emptyTitle}</Typography>
              <Typography variant="mobText3" color={COLORS.santasGrey}>
                {emptySubtitle}
              </Typography>
            </Box>
          ))}

        {!isLoading && !isEmpty && (
          <Box sx={RowsSx}>
            {currentItems.map((marketItem) => (
              <MobileMarketCard
                key={marketItem.id}
                marketItem={marketItem}
                showBorrower={showBorrowerInCard}
                baseRoute={baseRoute}
                destinations={
                  destinationsByMarket?.[marketItem.id.toLowerCase()]
                }
              />
            ))}
          </Box>
        )}
      </Box>

      {showPagination && (
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
            disabled={currentPage === 0}
            sx={PaginationArrowSx}
          >
            Prev
          </Button>

          <Box sx={{ display: "flex", gap: "8px" }}>
            {paginationItems.map((item, index) => {
              if (item === "...") {
                return (
                  <Box
                    // eslint-disable-next-line react/no-array-index-key
                    key={`ellipsis-${index}`}
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
                      item === currentPage ? COLORS.white03 : "transparent",

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
            disabled={currentPage === totalPages - 1}
            sx={PaginationArrowSx}
          >
            Next
          </Button>
        </Box>
      )}
    </Box>
  )
}
