import * as React from "react"

import { Box, Typography } from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { ClaimableTable } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests/ClaimableTable"
import { WithdrawalRequestsProps } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests/interface"
import { OutstandingTable } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests/OutstandingTable"
import {
  MarketWithdrawalRequetstCell,
  TotalAccordionSummary,
} from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests/style"
import { LinkGroup } from "@/components/LinkComponent"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas, trimAddress } from "@/utils/formatters"

import { OngoingTable } from "./OngoingTable"

export const WithdrawalRequests = ({
  withdrawals,
}: WithdrawalRequestsProps) => {
  const { t } = useTranslation()

  const expiredTotalAmount = withdrawals.expiredTotalPendingAmount
  const activeTotalAmount = withdrawals.activeTotalPendingAmount
  const claimableTotalAmount = withdrawals.totalClaimableAmount
  const totalAmount = expiredTotalAmount
    .add(activeTotalAmount)
    .add(claimableTotalAmount)

  const columns: GridColDef[] = [
    {
      sortable: false,
      field: "lender",
      headerName: t("lenderMarketDetails.requests.tableColumns.lender"),
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography variant="text3">{trimAddress(value)}</Typography>
          <LinkGroup linkValue={`${EtherscanBaseUrl}/address/${value}`} />
        </Box>
      ),
    },
    {
      sortable: false,
      field: "dateSubmitted",
      headerName: t("lenderMarketDetails.requests.tableColumns.date"),
      minWidth: 216,
      headerAlign: "left",
      align: "left",
    },
    {
      sortable: false,
      field: "transactionId",
      headerName: t("lenderMarketDetails.requests.tableColumns.txID"),
      minWidth: 216,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography variant="text3">{trimAddress(value)}</Typography>

          <LinkGroup
            linkValue={`${EtherscanBaseUrl}/tx/${value}`}
            copyValue={value}
          />
        </Box>
      ),
    },
    {
      sortable: false,
      field: "amount",
      headerName: t("lenderMarketDetails.requests.tableColumns.amount"),
      minWidth: 120,
      flex: 1,
      headerAlign: "right",
      align: "right",
    },
  ]

  return (
    <Box>
      <Typography variant="title3">
        {t("lenderMarketDetails.requests.title")}
      </Typography>

      <Box sx={TotalAccordionSummary}>
        <Typography variant="text2">
          {t("lenderMarketDetails.requests.total")}
        </Typography>

        <TextfieldChip
          text={formatTokenWithCommas(totalAmount, { withSymbol: true })}
          color={COLORS.whiteSmoke}
          textColor={COLORS.blackRock}
        />
      </Box>

      <OngoingTable
        withdrawals={
          withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []
        }
        totalAmount={activeTotalAmount}
        columns={columns}
      />

      <ClaimableTable
        withdrawals={withdrawals.expiredPendingWithdrawals}
        totalAmount={claimableTotalAmount}
        columns={columns}
      />

      <OutstandingTable
        totalAmount={expiredTotalAmount}
        withdrawals={withdrawals?.expiredPendingWithdrawals ?? []}
        columns={columns}
      />
    </Box>
  )
}
