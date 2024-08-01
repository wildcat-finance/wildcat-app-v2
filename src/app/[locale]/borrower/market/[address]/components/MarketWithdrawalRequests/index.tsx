import * as React from "react"
import { useState } from "react"

import { Box, IconButton, Link, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { WithdrawalBatch } from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"

import { RepayModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/RepayModal"
import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import Copy from "@/assets/icons/copy_icon.svg"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas, trimAddress } from "@/utils/formatters"

import { MarketWithdrawalRequestsProps, WithdrawalTxRow } from "./interface"
import {
  TotalAccordionSummary,
  DataGridCells,
  MarketWithdrawalRequestsContainer,
  MarketWithdrawalRequetstCell,
} from "./style"

export const MarketWithdrawalRequests = ({
  marketAccount,
}: MarketWithdrawalRequestsProps) => {
  const { market } = marketAccount

  const [isTotalOpen, setIsTotalOpen] = useState(true)
  const [isOngoingOpen, setIsOngoingOpen] = useState(false)
  const [isPastOpen, setIsPastOpen] = useState(false)

  const { t } = useTranslation()
  const { data } = useGetWithdrawals(market)

  const expiredTotalAmount = data.expiredWithdrawalsTotalOwed
  const activeTotalAmount = data.activeWithdrawalsTotalOwed
  const totalAmount = expiredTotalAmount.add(activeTotalAmount)

  const activeTxRows: Array<WithdrawalTxRow> = []
  const expiredTxRows: Array<WithdrawalTxRow> = []

  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const formatTx = (
    result: Array<WithdrawalTxRow>,
    txs: WithdrawalBatch[] | undefined,
  ) => {
    if (txs && txs[0] !== undefined) {
      txs.map((batch) =>
        batch.requests.map((withdrawal) =>
          result.push({
            id: withdrawal.id,
            lender: withdrawal.address,
            transactionId: withdrawal.transactionHash,
            dateSubmitted: dayjs(withdrawal.blockTimestamp * 1000).format(
              "DD-MMM-YYYY",
            ),
            claimable: "Yes",
            amount: formatTokenWithCommas(
              withdrawal.getNormalizedAmountOwed(batch),
              { withSymbol: true },
            ),
          }),
        ),
      )
    }
  }

  if (data?.activeWithdrawal)
    formatTx(activeTxRows, [data?.activeWithdrawal] as WithdrawalBatch[])

  if (data?.expiredPendingWithdrawals)
    formatTx(expiredTxRows, data?.expiredPendingWithdrawals)

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
      field: "transactionId",
      headerName: "Transaction ID",
      minWidth: 216,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography variant="text3">{trimAddress(value)}</Typography>
          <IconButton disableRipple sx={AddressButtons} onClick={() => {}}>
            <SvgIcon fontSize="medium">
              <Copy />
            </SvgIcon>
          </IconButton>
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
      minWidth: 112,
      headerAlign: "left",
      align: "left",
    },
    {
      sortable: false,
      field: "claimable",
      headerName: "Claimable",
      minWidth: 112,
      headerAlign: "left",
      align: "left",
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
        {(market.isDelinquent || market.isIncurringPenalties) && (
          <RepayModal
            marketAccount={marketAccount}
            buttonType="withdrawalTable"
          />
        )}
      </Box>

      <DetailsAccordion
        isOpen={isTotalOpen}
        setIsOpen={setIsTotalOpen}
        summaryText="Total"
        chipValue={formatTokenWithCommas(totalAmount, { withSymbol: true })}
        summarySx={TotalAccordionSummary}
      >
        <DetailsAccordion
          isOpen={isOngoingOpen}
          setIsOpen={setIsOngoingOpen}
          summaryText="Ongoing"
          summarySx={{
            borderRadius: "0px",
            marginBottom: isOngoingOpen ? "0px" : "12px",
            borderBottom: isOngoingOpen ? "none" : `1px solid`,
            borderColor: COLORS.athensGrey,
          }}
          chipValue={formatTokenWithCommas(activeTotalAmount, {
            withSymbol: true,
          })}
        >
          {activeTxRows.length ? (
            <DataGrid
              sx={DataGridCells}
              rows={activeTxRows}
              columns={columns}
              columnHeaderHeight={40}
            />
          ) : (
            <Box display="flex" flexDirection="column" padding="0 16px">
              <Typography variant="title3">
                There are no ongoing withdrawals
              </Typography>
            </Box>
          )}
        </DetailsAccordion>

        <DetailsAccordion
          isOpen={isPastOpen}
          setIsOpen={setIsPastOpen}
          summaryText="Outstanding from past cycles"
          summarySx={{
            borderRadius: "0px",
            marginBottom: isPastOpen ? "0px" : "12px",
            borderBottom: isPastOpen ? "none" : `1px solid`,
            borderColor: COLORS.athensGrey,
          }}
          chipValue={formatTokenWithCommas(expiredTotalAmount, {
            withSymbol: true,
          })}
          chipColor={
            market.isDelinquent || market.isIncurringPenalties
              ? COLORS.remy
              : undefined
          }
          chipValueColor={
            market.isDelinquent || market.isIncurringPenalties
              ? COLORS.dullRed
              : undefined
          }
        >
          {expiredTxRows.length ? (
            <DataGrid
              sx={DataGridCells}
              rows={expiredTxRows}
              columns={columns}
              columnHeaderHeight={40}
            />
          ) : (
            <Box display="flex" flexDirection="column" padding="0 16px">
              <Typography variant="title3">
                There are no outstanding withdrawals from past cycles
              </Typography>
            </Box>
          )}
        </DetailsAccordion>
      </DetailsAccordion>
    </Box>
  )
}
