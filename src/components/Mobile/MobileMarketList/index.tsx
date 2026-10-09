import React, { ReactNode, useState } from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { usePathname } from "next/navigation"

import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { getPaginationRange } from "@/utils/pagination"

import { LenderMobileMarketItem, MobileMarketCard } from "../MobileMarketCard"

const ITEMS_PER_PAGE = 20

const MobileListContainerSx = {
  display: "flex",
  flexDirection: "column",
  padding: "8px",
  borderRadius: "14px",
  backgroundColor: COLORS.white,
} as const

export const MobileMarketList = ({
  markets,
  isLoading = false,
  header,
  showDestinations = false,
  emptyTitle = "No Markets Here",
}: {
  markets: readonly LenderMobileMarketItem[]
  isLoading?: boolean
  header?: ReactNode
  showDestinations?: boolean
  emptyTitle?: string
}) => {
  const [page, setPage] = useState(0)
  const pathname = usePathname()

  const isBorrowerProfilePage = pathname.includes(ROUTES.borrower.profile)
  const isLenderProfilePage = pathname.includes(ROUTES.lender.profile)

  const showBorrowerInCard = !isBorrowerProfilePage && !isLenderProfilePage
  const baseRoute = isBorrowerProfilePage
    ? ROUTES.borrower.market
    : ROUTES.lender.market

  const totalPages = Math.ceil(markets.length / ITEMS_PER_PAGE)
  const currentPage = Math.min(page, Math.max(0, totalPages - 1))
  const startIndex = currentPage * ITEMS_PER_PAGE
  const currentItems = markets.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  const isEmpty = !markets.length && !isLoading

  const handlePrev = () => setPage(Math.max(currentPage - 1, 0))
  const handleNext = () => setPage(Math.min(currentPage + 1, totalPages - 1))

  const paginationItems = getPaginationRange(currentPage, totalPages)

  return (
    <Box sx={{ display: "flex", flexDirection: "column", marginTop: "4px" }}>
      <Box sx={MobileListContainerSx}>
        {header}

        {isEmpty && (
          <Box
            sx={{
              height: "131px",
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
              Change selected filters or check other sections
            </Typography>
          </Box>
        )}

        {!isLoading &&
          currentItems.map((marketItem, index) => (
            <MobileMarketCard
              key={marketItem.id}
              marketItem={marketItem}
              showBorrower={showBorrowerInCard}
              baseRoute={baseRoute}
              showDestinations={showDestinations}
              divider={index < currentItems.length - 1}
            />
          ))}

        {isLoading && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from({ length: 3 }, (_, i) => `skeleton-${i}`).map((key) => (
              <Skeleton
                key={key}
                sx={{
                  width: "100%",
                  height: "130px",
                  backgroundColor: COLORS.athensGrey,
                  borderRadius: "10px",
                }}
              />
            ))}
          </Box>
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
            disabled={currentPage === 0}
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
