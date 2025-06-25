import { useMemo } from "react"

import { Box, Button, IconButton, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef, GridValidRowModel } from "@mui/x-data-grid"
import { MarketCollateralV1, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { MarketWithdrawalRequetstCell } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/style"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { EtherscanBaseUrl } from "@/config/network"
import { useGetTokenPrices } from "@/hooks/useGetTokenPrices"
import { COLORS } from "@/theme/colors"
import { tokenAmountComparator } from "@/utils/comparators"
import { formatTokenWithCommas } from "@/utils/formatters"

export type CollateralContractsTableProps = {
  collateralContracts: MarketCollateralV1[]
  setSelectedCollateralContract: (
    collateralContract: MarketCollateralV1 | undefined,
  ) => void
}

export type TypeSafeColDef<
  R extends GridValidRowModel,
  F extends string | void = void,
> = GridColDef<R> & {
  field: keyof R | "action" | F
}

export const CollateralContractsTable = ({
  collateralContracts,
  setSelectedCollateralContract,
}: CollateralContractsTableProps) => {
  const { t } = useTranslation()
  const allTokens = useMemo(
    () =>
      // filter to only unique tokens
      collateralContracts
        .map((contract) => [
          contract.collateralAsset,
          contract.market.underlyingToken,
        ])
        .flat()
        .filter(
          (token, index, self) =>
            self.findIndex((ti) => ti.address === token.address) === index,
        ),
    [collateralContracts],
  )
  const { data: tokenPrices } = useGetTokenPrices(allTokens)
  const getTokenValueSuffix = (amount: TokenAmount) => {
    if (amount.gt(0) && tokenPrices) {
      const tokenPrice = tokenPrices[amount.token.address.toLowerCase()]
      if (tokenPrice) {
        return `  ($${+(+amount.format() * tokenPrice.usdPrice).toFixed(0)})`
      }
    }
    return ""
  }
  const columns: TypeSafeColDef<MarketCollateralV1>[] = [
    {
      sortable: false,
      field: "collateralAsset",
      headerName: t("collateral.list.asset"),
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value: collateralAsset }) => (
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography variant="text3">{collateralAsset.name}</Typography>
          <Link
            href={`${EtherscanBaseUrl}/address/${collateralAsset.address}`}
            target="_blank"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <IconButton disableRipple sx={AddressButtons}>
              <SvgIcon fontSize="medium">
                <LinkIcon />
              </SvgIcon>
            </IconButton>
          </Link>
        </Box>
      ),
    },
    {
      field: "availableCollateral",
      headerName: t("collateral.list.availableCollateral"),
      minWidth: 176,
      headerAlign: "right",
      align: "right",
      sortComparator: (a: TokenAmount, b: TokenAmount) =>
        tokenAmountComparator(a, b),
      renderCell: ({ value: availableCollateral }) => (
        <Typography variant="text3">
          {formatTokenWithCommas(availableCollateral, {
            withSymbol: true,
          })}
          {getTokenValueSuffix(availableCollateral)}
        </Typography>
      ),
    },
    {
      field: "totalDeposited",
      headerName: t("collateral.list.totalDeposited"),
      minWidth: 176,
      headerAlign: "right",
      align: "right",
      sortComparator: (a: TokenAmount, b: TokenAmount) =>
        !a || !b ? 0 : tokenAmountComparator(a, b),
      renderCell: ({ value: totalDeposited }) =>
        totalDeposited ? (
          <Typography variant="text3">
            {formatTokenWithCommas(totalDeposited, {
              withSymbol: true,
            })}
            {getTokenValueSuffix(totalDeposited)}
          </Typography>
        ) : (
          ""
        ),
    },
    {
      field: "totalLiquidated",
      headerName: t("collateral.list.totalLiquidated"),
      minWidth: 176,
      headerAlign: "right",
      align: "right",
      sortComparator: (a: TokenAmount, b: TokenAmount) =>
        !a || !b ? 0 : tokenAmountComparator(a, b),
      renderCell: ({ value: totalLiquidated }) =>
        totalLiquidated ? (
          <Typography variant="text3">
            {formatTokenWithCommas(totalLiquidated, {
              withSymbol: true,
            })}
            {getTokenValueSuffix(totalLiquidated)}
          </Typography>
        ) : (
          ""
        ),
    },
    {
      field: "contract",
      sortable: false,
      headerName: "",
      minWidth: 176,
      headerAlign: "right",
      align: "right",
      renderCell: ({ row }) => (
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => setSelectedCollateralContract(row)}
        >
          View
        </Button>
      ),
    },
  ]

  if (collateralContracts.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Typography variant="text1" color={COLORS.dullRed}>
          No collateral contracts found for this market
        </Typography>
      </Box>
    )
  }

  return (
    <DataGrid
      sx={{
        overflow: "auto",
        maxWidth: "calc(100vw - 267px)",

        "& .MuiDataGrid-cell": {
          minHeight: "52px",
          height: "auto",
          cursor: "default",
        },
      }}
      rows={collateralContracts || []}
      columns={columns}
      columnHeaderHeight={40}
      getRowHeight={() => "auto"}
      getRowId={(row) => row.address}
    />
  )
}
