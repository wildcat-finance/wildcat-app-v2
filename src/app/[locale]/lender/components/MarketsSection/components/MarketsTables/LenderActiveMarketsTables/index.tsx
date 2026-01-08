import * as React from "react"
import { useEffect, useRef } from "react"

import { Box, Button, Typography } from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { MarketsTableModel } from "@/app/[locale]/borrower/components/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MobileMarketCard } from "@/app/[locale]/lender/components/mobile/MobileMarketCard"
import { MobileMarketList } from "@/app/[locale]/lender/components/mobile/MobileMarketList"
import Ethena from "@/assets/companies-icons/ethena_icon.svg"
import Ethereal from "@/assets/companies-icons/ethereal_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { AurosEthenaBanner } from "@/components/AdsBanners/AurosEthena/AurosEthenaBanner"
import { AurosEthenaProposalChip } from "@/components/AdsBanners/AurosEthena/AurosEthenaProposalChip"
import { AprTooltip } from "@/components/AdsBanners/Common/AprTooltip"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import { AUROS_ETHENA_ADDRESS, pageCalcHeights } from "@/utils/constants"
import {
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type LenderActiveMarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string | undefined
  asset: string
  debt: TokenAmount | undefined
  loan: TokenAmount | undefined
  apr: number
  withdrawalBatchDuration: number
  capacityLeft: TokenAmount
  hasEverInteracted: boolean
}

export const LenderActiveMarketsTables = ({
  marketAccounts,
  borrowers,
  isLoading,
  filters,
}: {
  marketAccounts: MarketAccount[]
  borrowers: BorrowerWithName[]
  isLoading: boolean
  filters: {
    nameFilter: string
    assetFilter: SmallFilterSelectItem[]
    statusFilter: MarketStatus[]
  }
}) => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const scrollTargetId = useAppSelector(
    (state) => state.lenderDashboard.scrollTarget,
  )

  const depositedRef = useRef<HTMLDivElement>(null)
  const nonDepositedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMobile) {
      if (scrollTargetId === "deposited" && depositedRef.current) {
        depositedRef.current.scrollIntoView({ behavior: "smooth" })
        dispatch(setScrollTarget(null))
      }
      if (scrollTargetId === "non-deposited" && nonDepositedRef.current) {
        nonDepositedRef.current.scrollIntoView({ behavior: "smooth" })
        dispatch(setScrollTarget(null))
      }
    }
  }, [scrollTargetId])

  const rows: GridRowsProp<LenderActiveMarketsTableModel> = marketAccounts.map(
    (account) => {
      const { market, marketBalance, hasEverInteracted } = account

      const {
        address,
        borrower: borrowerAddress,
        name,
        underlyingToken,
        annualInterestBips,
        maxTotalSupply,
        totalSupply,
        withdrawalBatchDuration,
      } = market

      const borrower = borrowers?.find(
        (b) => b.address.toLowerCase() === borrowerAddress.toLowerCase(),
      )
      const borrowerName = borrower
        ? borrower.alias || borrower.name
        : trimAddress(borrowerAddress)
      const marketStatus = getMarketStatusChip(market)
      const marketType = getMarketTypeChip(market)

      return {
        id: address,
        status: marketStatus,
        term: marketType,
        name,
        borrower: borrowerName,
        borrowerAddress,
        asset: underlyingToken.symbol,
        apr: annualInterestBips,
        withdrawalBatchDuration,
        loan: marketBalance,
        debt: totalSupply,
        capacityLeft: maxTotalSupply.sub(totalSupply),
        hasEverInteracted,
      }
    },
  )

  const depositedMarkets = rows.filter((market) => market.hasEverInteracted)

  const nonDepositedMarkets = rows.filter((market) => !market.hasEverInteracted)

  const columns: TypeSafeColDef<LenderActiveMarketsTableModel>[] = [
    {
      field: "name",
      headerName: t("dashboard.markets.tables.header.name"),
      flex: 2,
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            paddingRight: "16px",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "6px",
            minWidth: 0,
          }}
        >
          <Typography
            variant="text3"
            sx={{
              display: "block",
              width: "100%",
              minWidth: 0,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {params.value}
          </Typography>

          <Link
            href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
            style={{ display: "flex", textDecoration: "none" }}
          >
            <BorrowerProfileChip borrower={params.row.borrower} />
          </Link>
        </Link>
      ),
    },
    {
      field: "status",
      headerName: t("dashboard.markets.tables.header.status"),
      minWidth: 100,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box width="120px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "term",
      headerName: t("dashboard.markets.tables.header.term"),
      minWidth: 100,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: typeComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box minWidth="170px">
            <MarketTypeChip type="table" {...params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "apr",
      headerName: t("dashboard.markets.tables.header.apr"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => {
        const isAurosTestnet =
          params.row.id.toLowerCase() ===
          AUROS_ETHENA_ADDRESS.testnet.toLowerCase()
        const isAurosMainnet =
          params.row.id.toLowerCase() ===
          AUROS_ETHENA_ADDRESS.mainnet.toLowerCase()

        const isAuros = isAurosTestnet || isAurosMainnet

        const adsComponent = isAuros ? (
          <AprTooltip
            baseAPR={formatBps(params.value)}
            aprProposal={<AurosEthenaProposalChip isTooltip />}
            banner={<AurosEthenaBanner />}
            withdrawalAnyTime
          />
        ) : undefined

        return (
          <Link
            href={`${ROUTES.lender.market}/${params.row.id}`}
            style={{ ...LinkCell, justifyContent: "flex-end" }}
          >
            <AprChip
              isBonus={isAuros}
              baseApr={formatBps(params.value)}
              icons={isAuros ? [<Ethena />, <Ethereal />] : undefined}
              adsComponent={adsComponent}
            />
          </Link>
        )
      },
    },
    {
      field: "withdrawalBatchDuration",
      headerName: t("dashboard.markets.tables.header.withdrawal"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
          {formatSecsToHours(params.value, true)}
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: t("dashboard.markets.tables.header.asset"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "capacityLeft",
      headerName: t("dashboard.markets.tables.header.capacity"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<MarketsTableModel, TokenAmount>,
      ) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            textDecoration: "none",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: "inherit",
            justifyContent: "flex-end",
          }}
        >
          {params.value && params.value.gt(0)
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Link>
      ),
    },
    {
      field: "debt",
      headerName: t("dashboard.markets.tables.header.debt"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Link>
      ),
    },
    {
      field: "loan",
      headerName: t("dashboard.markets.tables.header.loan"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<MarketsTableModel, TokenAmount>,
      ) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Link>
      ),
    },
  ]

  if (isMobile)
    return (
      <>
        {scrollTargetId === "deposited" && (
          <MobileMarketList markets={depositedMarkets} isLoading={isLoading} />
        )}
        {scrollTargetId === "non-deposited" && (
          <MobileMarketList
            markets={nonDepositedMarkets}
            isLoading={isLoading}
          />
        )}
      </>
    )

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: `calc(100vh - ${pageCalcHeights.dashboard})`,
        width: "100%",
        overflow: "auto",
        overflowY: "auto",
        gap: "16px",
        marginTop: "24px",
        paddingBottom: "26px",
      }}
    >
      <Box id="deposited" ref={depositedRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.borrower.active.deposited")}
          marketsLength={depositedMarkets.length}
          isLoading={isLoading}
          isOpen
          noMarketsTitle={t("dashboard.markets.noMarkets.active.title")}
          noMarketsSubtitle={t(
            "dashboard.markets.noMarkets.active.lenderSubtitle",
          )}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          {isMobile ? (
            <Box display="flex" flexDirection="column">
              {depositedMarkets.map((marketItem) => (
                <MobileMarketCard
                  marketItem={marketItem}
                  buttonText="Deposit"
                  buttonIcon
                />
              ))}
            </Box>
          ) : (
            <DataGrid
              sx={{
                overflow: "auto",
                maxWidth: "calc(100vw - 267px)",
                padding: "0 16px",
                "& .MuiDataGrid-columnHeader": { padding: 0 },
                "& .MuiDataGrid-row": {
                  minHeight: "66px !important",
                  maxHeight: "66px !important",
                },
                "& .MuiDataGrid-cell": {
                  padding: "0px",
                  minHeight: "66px",
                  height: "auto",
                },
              }}
              getRowHeight={() => "auto"}
              rows={depositedMarkets}
              columns={columns}
              columnHeaderHeight={40}
            />
          )}
        </MarketsTableAccordion>
      </Box>

      <Box id="non-deposited" ref={nonDepositedRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.borrower.active.nonDeposited")}
          isLoading={isLoading}
          isOpen
          noMarketsTitle={t("dashboard.markets.noMarkets.active.title")}
          noMarketsSubtitle={t(
            "dashboard.markets.noMarkets.active.lenderSubtitle",
          )}
          marketsLength={nonDepositedMarkets.length}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          {isMobile ? (
            <Box display="flex" flexDirection="column">
              {nonDepositedMarkets.map((marketItem) => (
                <MobileMarketCard
                  marketItem={marketItem}
                  buttonText="Deposit"
                  buttonIcon
                />
              ))}
            </Box>
          ) : (
            <DataGrid
              sx={{
                overflow: "auto",
                maxWidth: "calc(100vw - 267px)",
                padding: "0 16px",
                "& .MuiDataGrid-columnHeader": { padding: 0 },
                "& .MuiDataGrid-row": {
                  minHeight: "66px !important",
                  maxHeight: "66px !important",
                },
                "& .MuiDataGrid-cell": {
                  padding: "0px",
                  minHeight: "66px",
                  height: "auto",
                },
              }}
              getRowHeight={() => "auto"}
              rows={nonDepositedMarkets}
              columns={columns}
              columnHeaderHeight={40}
            />
          )}
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
