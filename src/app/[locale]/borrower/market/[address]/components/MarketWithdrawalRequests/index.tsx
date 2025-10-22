import * as React from "react"

import { Box, IconButton, SvgIcon, Typography, useTheme } from "@mui/material"
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
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
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
  const theme = useTheme()
  const isMobile = useMobileResolution()
  const { getAddressUrl, getTxUrl } = useBlockExplorer()
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
            href={getAddressUrl(value)}
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

          <LinkGroup linkValue={getTxUrl(value)} copyValue={value} />
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
    <Box sx={MarketWithdrawalRequestsContainer(theme)} id="withdrawals">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="title3" sx={isMobile ? { marginTop: "12px" } : {}}>
          {t("marketWithdrawalRequests.openWithdrawals")}
        </Typography>
        {(market.isDelinquent || market.isIncurringPenalties) &&
          isHoldingMarket && (
            <RepayModal
              marketAccount={marketAccount}
              buttonType="withdrawalTable"
            />
          )}
      </Box>

      <Box sx={TotalAccordionSummary(theme)}>
        <Typography variant="text2">
          {t("marketWithdrawalRequests.total")}
        </Typography>

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
      />
    </Box>
  )
}
