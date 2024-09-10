import * as React from "react"

import { Box, IconButton, SvgIcon, Typography } from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { ClaimableTable } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/ClaimableTable"
import { OngoingTable } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/OngoingTable"
import { OutstandingTable } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/OutstandingTable"
import { RepayModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/RepayModal"
import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { LinkGroup } from "@/components/LinkComponent"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas, trimAddress } from "@/utils/formatters"

import { MarketWithdrawalRequestsProps } from "./interface"
import {
  TotalAccordionSummary,
  MarketWithdrawalRequestsContainer,
  MarketWithdrawalRequetstCell,
} from "./style"

export const MarketWithdrawalRequests = ({
  marketAccount,
  isHoldingMarket,
}: MarketWithdrawalRequestsProps) => {
  const { market } = marketAccount

  const { t } = useTranslation()
  const { data } = useGetWithdrawals(market)

  const expiredTotalAmount = data.expiredWithdrawalsTotalOwed
  const activeTotalAmount = data.activeWithdrawalsTotalOwed
  const claimableTotalAmount = data.claimableWithdrawalsAmount
  const totalAmount = expiredTotalAmount
    .add(activeTotalAmount)
    .add(claimableTotalAmount)

  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const columns: GridColDef[] = [
    {
      sortable: false,
      field: "lender",
      headerName: "Lender",
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography variant="text3">
            {lendersName[value] || trimAddress(value)}
          </Typography>
          <Link
            href={`${EtherscanBaseUrl}/address/${value}`}
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
      sortable: false,
      field: "dateSubmitted",
      headerName: "Date Submitted",
      minWidth: 216,
      headerAlign: "left",
      align: "left",
    },
    {
      sortable: false,
      field: "transactionId",
      headerName: "Transaction ID",
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
      headerName: "Amount",
      minWidth: 120,
      flex: 1,
      headerAlign: "right",
      align: "right",
    },
  ]
  return (
    <Box sx={MarketWithdrawalRequestsContainer} id="withdrawals">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="title3">Open Withdrawals</Typography>
        {(market.isDelinquent || market.isIncurringPenalties) &&
          isHoldingMarket && (
            <RepayModal
              marketAccount={marketAccount}
              buttonType="withdrawalTable"
            />
          )}
      </Box>

      <Box sx={TotalAccordionSummary}>
        <Typography variant="text2">Total</Typography>

        <TextfieldChip
          text={formatTokenWithCommas(totalAmount, { withSymbol: true })}
          color={COLORS.whiteSmoke}
          textColor={COLORS.blackRock}
        />
      </Box>

      <OngoingTable
        withdrawalBatches={
          data?.activeWithdrawal ? [data.activeWithdrawal] : []
        }
        totalAmount={activeTotalAmount}
        columns={columns}
      />

      <ClaimableTable
        withdrawalBatches={data.batchesWithClaimableWithdrawals ?? []}
        totalAmount={data.claimableWithdrawalsAmount}
      />

      <OutstandingTable
        columns={columns}
        withdrawalBatches={data?.expiredPendingWithdrawals ?? []}
        totalAmount={data.expiredWithdrawalsTotalOwed}
        isIncurringPenalties={
          market.isDelinquent || market.isIncurringPenalties
        }
      />
    </Box>
  )
}
