import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
import { GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import {
  HooksKind,
  LenderRole,
  MarketAccount,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import {
  MarketsTableModel,
  TypeSafeColDef,
} from "@/app/[locale]/lender/components/MarketsTab/interface"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { TooltipButton } from "@/components/TooltipButton"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { statusComparator, tokenAmountComparator } from "@/utils/comparators"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import {
  formatBps,
  formatTokenWithCommas,
  timestampToDateFormatted,
  trimAddress,
} from "@/utils/formatters"
import {
  getMarketStatus,
  getMarketStatusChip,
  MarketAssets,
  MarketStatus,
} from "@/utils/marketStatus"

export const filterMarketAccounts = (
  marketAccounts: MarketAccount[] | undefined,
  name: string,
  statuses: MarketStatus[],
  assets: { name: string; address: string }[],
) => {
  if (!marketAccounts) return []

  let filteredMarkets = marketAccounts.filter(
    (account) =>
      !EXCLUDED_MARKETS.includes(account.market.address.toLowerCase()) ||
      account.isAuthorizedOnController ||
      account.role !== LenderRole.Null,
  )

  const assetsNames = assets.map((asset) => asset.name)

  if (filteredMarkets && name !== "") {
    filteredMarkets = filteredMarkets.filter(({ market }) =>
      market.name.toLowerCase().includes(name.toLowerCase()),
    )
  }

  if (filteredMarkets && statuses.length > 0) {
    filteredMarkets = filteredMarkets.filter(({ market }) =>
      statuses.includes(
        getMarketStatus(
          market.isClosed,
          market.isDelinquent || market.willBeDelinquent,
          market.isIncurringPenalties,
        ),
      ),
    )
  }

  if (filteredMarkets && assets.length > 0) {
    filteredMarkets = filteredMarkets.filter(({ market }) =>
      assetsNames.includes(market.underlyingToken.symbol as MarketAssets),
    )
  }

  return filteredMarkets
}

export const getColumns = (
  otherMarketsTable?: boolean,
): TypeSafeColDef<MarketsTableModel>[] => {
  const commonColumns: TypeSafeColDef<MarketsTableModel>[] = [
    {
      field: "status",
      headerName: "Status",
      maxWidth: 146,
      minWidth: 130,
      flex: 2,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            textDecoration: "none",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: "inherit",
            justifyContent: "flex-start",
          }}
        >
          <Box width="130px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "name",
      headerName: "Market Name",
      flex: 1.7,
      minWidth: 134,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            textDecoration: "none",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: "inherit",
            justifyContent: "flex-start",
          }}
        >
          <span
            style={{
              width: "100%",
              paddingRight: "20px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {params.value}
          </span>
        </Link>
      ),
    },
    {
      field: "borrowerName",
      minWidth: 134,
      flex: 1.7,
      headerAlign: "left",
      align: "left",
      renderHeader: () => (
        <Typography
          variant="text4"
          sx={{
            lineHeight: "10px",
            color: COLORS.santasGrey,
            padding: "0 12px",
          }}
        >
          Borrower
        </Typography>
      ),
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            textDecoration: "none",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: "inherit",
            justifyContent: "flex-start",
          }}
        >
          <Link
            href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
            style={{
              textDecoration: "none",
              width: "fit-content",
              height: "fit-content",
            }}
          >
            <Button
              size="small"
              variant="text"
              sx={{
                fontSize: "13px",
                lineHeight: "20px",
                fontWeight: 500,
                minWidth: "fit-content",
                width: "fit-content",
              }}
            >
              {params.value}
            </Button>
          </Link>
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: "Underlying Asset",
      minWidth: 131,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
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
          {params.value}
        </Link>
      ),
    },
    {
      field: "lenderAPR",
      headerName: "APR",
      minWidth: 102,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
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
          {`${formatBps(params.value)}%`}
        </Link>
      ),
    },
    {
      field: "crr",
      headerName: "CRR",
      minWidth: 79,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderHeader: () => (
        <Box display="flex" columnGap="4px" alignItems="center">
          <Typography
            variant="text4"
            sx={{ lineHeight: "10px", color: COLORS.santasGrey }}
          >
            CRR
          </Typography>
          <TooltipButton value="TBD" />
        </Box>
      ),
      renderCell: (params) => (
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
          {`${formatBps(params.value)}%`}
        </Link>
      ),
    },
    {
      field: "maxCapacity",
      headerName: "Max. Capacity",
      minWidth: 106,
      flex: 1.6,
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
          {params.value ? formatTokenWithCommas(params.value) : "0"}
        </Link>
      ),
    },
    {
      field: "lend",
      headerName: "To lend",
      minWidth: 82,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      flex: 1.5,
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
      field: "deploy",
      headerName: "Deployed",
      minWidth: otherMarketsTable ? 86 : 126,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
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
          <Typography
            variant="text4"
            sx={{
              maxWidth: otherMarketsTable ? "86px" : "fit-content",
              color: COLORS.santasGrey,
              whiteSpace: "break-spaces",
              textAlign: "right",
            }}
          >
            {timestampToDateFormatted(params.value)}
          </Typography>
        </Link>
      ),
      flex: 1.2,
    },
  ]

  const updatedColumns = [...commonColumns]

  const loanColumn: TypeSafeColDef<{ loan: TokenAmount }> = {
    field: "loan",
    headerName: "My loan",
    minWidth: 85,
    headerAlign: "right",
    align: "right",
    sortComparator: tokenAmountComparator,
    flex: 1.5,
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
        {params.value
          ? formatTokenWithCommas(params.value, {
              withSymbol: false,
              fractionDigits: 2,
            })
          : "0"}
      </Link>
    ),
  }

  const selfOnboardColumn: TypeSafeColDef<{ selfOnboard: boolean }> = {
    field: "selfOnboard",
    headerName: "Self-Onboard",
    minWidth: 110,
    headerAlign: "right",
    align: "right",
    renderCell: (params) => (
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
        <Typography variant="text3" color={COLORS.blackRock}>
          {params.value ? "Yes" : "No"}
        </Typography>
      </Link>
    ),
    flex: 1,
  }

  if (otherMarketsTable) {
    updatedColumns.push(selfOnboardColumn)
  } else {
    updatedColumns.splice(7, 0, loanColumn)
  }

  return updatedColumns
}

export const getRows = (
  marketAccounts: MarketAccount[],
  borrowers: BorrowerWithName[],
): GridRowsProp<MarketsTableModel> =>
  marketAccounts.map((marketAccount) => {
    const { market, marketBalance } = marketAccount

    const {
      address,
      borrower: borrowerAddress,
      name,
      underlyingToken,
      annualInterestBips,
      reserveRatioBips,
      maxTotalSupply,
      maximumDeposit,
      deployedEvent,
    } = market

    const borrower = borrowers?.find(
      (b) => b.address.toLowerCase() === borrowerAddress.toLowerCase(),
    )
    const borrowerName = borrower ? borrower.name : trimAddress(borrowerAddress)
    const marketStatus = getMarketStatusChip(market)

    return {
      id: address,
      status: marketStatus,
      name,
      borrowerName,
      borrowerAddress,
      asset: underlyingToken.symbol,
      lenderAPR: annualInterestBips,
      crr: reserveRatioBips,
      maxCapacity: maxTotalSupply,
      loan: marketBalance,
      lend: maximumDeposit,
      deploy: deployedEvent ? deployedEvent.blockTimestamp : 0,
      selfOnboard:
        !marketAccount.hasEverInteracted &&
        marketAccount.inferredRole !== LenderRole.Null,
    }
  })
