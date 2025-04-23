import React from "react"

import {
  Box,
  Stack,
  Typography,
  styled,
  useMediaQuery,
  Theme,
} from "@mui/material"
import { DepositStatus } from "@wildcatfi/wildcat-sdk"
import { formatUnits } from "ethers/lib/utils"
import { useTranslation } from "react-i18next"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MarketCard } from "@/components/MarketCard"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { COLORS } from "@/theme/colors"
import { ROUTES } from "@/routes"
import { MarketStatus } from "@/utils/marketStatus"

import { LenderMarketsTable } from "./LenderMarketsTable"
import { NonDepositedTableProps } from "./interfaces"

const NoMarketsBlock = styled(Box)({
  backgroundColor: COLORS.hintOfRed,
  borderRadius: 8,
  padding: "24px 16px",
  width: "100%",
})

const TableContainer = styled(Box)({
  marginTop: 32,
  width: "100%",
})

export const LenderActiveMarketsTables = ({
  marketAccounts,
  isLoading,
  borrowers,
  filters,
  isMobile,
}: NonDepositedTableProps) => {
  const { t } = useTranslation()
  const isSmallScreen = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("md"),
  )
  const mobileView = isMobile || isSmallScreen

  const depositedMarkets = marketAccounts?.filter(
    (account) => account.depositAvailability === DepositStatus.Ready,
  )

  const nonDepositedMarkets = marketAccounts?.filter(
    (account) => account.depositAvailability !== DepositStatus.Ready,
  )

  return (
    <Box
      sx={{
        paddingTop: "24px",
        paddingX: mobileView ? "16px" : "24px",
        width: "100%",
      }}
    >
      <Stack spacing={3} sx={{ width: "100%" }}>
        <MarketsTableAccordion
          isOpen
          isLoading={isLoading}
          label={t("dashboard.markets.tables.borrower.active.deposited")}
          marketsLength={depositedMarkets?.length}
          type={t(
            "dashboard.markets.tables.borrower.active.deposited",
          ).toLowerCase()}
          noMarketsTitle={t(
            "dashboard.markets.noMarkets.lender.deposited.title",
          )}
          noMarketsSubtitle={t(
            "dashboard.markets.noMarkets.lender.deposited.subtitle",
          )}
          showNoFilteredMarkets
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          nameFilter={filters.nameFilter}
          isMobile={mobileView}
        >
          {mobileView ? (
            <Box sx={{ padding: "12px", width: "100%" }}>
              {depositedMarkets?.map((market) => {
                const borrower = borrowers?.find(
                  (b) =>
                    b.address.toLowerCase() === market.market.borrower.toLowerCase(),
                )
                const { symbol, status, isDelinquent } = market.market
                const apr = `${market.market.aprBps / 100}%`
                
                return (
                  <MarketCard
                    key={market.market.address}
                    marketName={market.market.name}
                    borrowerName={borrower?.name}
                    borrowerAddress={market.market.borrower}
                    marketAddress={market.market.address}
                    assetName={symbol}
                    apr={apr}
                    marketLink={`${ROUTES.lender.market}/${market.market.address}`}
                    capacity={`${formatUnits(
                      market.market.maxTotalSupply,
                      market.market.underlyingToken.decimals,
                    )} ${symbol}`}
                    totalDeposited={`${formatUnits(
                      market.market.totalSupply,
                      market.market.underlyingToken.decimals,
                    )} ${symbol}`}
                    delinquent={isDelinquent}
                    status={status}
                    isLender
                  />
                )
              })}
            </Box>
          ) : (
            <LenderMarketsTable
              markets={depositedMarkets ?? []}
              borrowers={borrowers}
              isLoading={isLoading}
              mobileView={mobileView}
            />
          )}
        </MarketsTableAccordion>

        <MarketsTableAccordion
          isOpen
          isLoading={isLoading}
          label={t("dashboard.markets.tables.borrower.active.nonDeposited")}
          marketsLength={nonDepositedMarkets?.length}
          type={t(
            "dashboard.markets.tables.borrower.active.nonDeposited",
          ).toLowerCase()}
          noMarketsTitle={t(
            "dashboard.markets.noMarkets.lender.nonDeposited.title",
          )}
          noMarketsSubtitle={t(
            "dashboard.markets.noMarkets.lender.nonDeposited.subtitle",
          )}
          showNoFilteredMarkets
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          nameFilter={filters.nameFilter}
          isMobile={mobileView}
        >
          {mobileView ? (
            <Box sx={{ padding: "12px", width: "100%" }}>
              {nonDepositedMarkets?.map((market) => {
                const borrower = borrowers?.find(
                  (b) =>
                    b.address.toLowerCase() === market.market.borrower.toLowerCase(),
                )
                const { symbol, status, isDelinquent } = market.market
                const apr = `${market.market.aprBps / 100}%`
                
                return (
                  <MarketCard
                    key={market.market.address}
                    marketName={market.market.name}
                    borrowerName={borrower?.name}
                    borrowerAddress={market.market.borrower}
                    marketAddress={market.market.address}
                    assetName={symbol}
                    apr={apr}
                    marketLink={`${ROUTES.lender.market}/${market.market.address}`}
                    capacity={`${formatUnits(
                      market.market.maxTotalSupply,
                      market.market.underlyingToken.decimals,
                    )} ${symbol}`}
                    totalDeposited={`${formatUnits(
                      market.market.totalSupply,
                      market.market.underlyingToken.decimals,
                    )} ${symbol}`}
                    delinquent={isDelinquent}
                    status={status}
                    isLender
                  />
                )
              })}
            </Box>
          ) : (
            <LenderMarketsTable
              markets={nonDepositedMarkets ?? []}
              borrowers={borrowers}
              isLoading={isLoading}
              mobileView={mobileView}
            />
          )}
        </MarketsTableAccordion>
      </Stack>
    </Box>
  )
} 