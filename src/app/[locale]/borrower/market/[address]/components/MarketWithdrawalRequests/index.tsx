import {
  Box,
  Divider,
  IconButton,
  Link,
  SvgIcon,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { WithdrawalBatch } from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"

import { Accordion } from "@/components/Accordion"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { EtherscanBaseUrl } from "@/config/network"
import {
  DATE_FORMAT,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"

import { MarketWithdrawalRequestsProps, WithdrawalTxRow } from "./interface"
import {
  AccordionSummaryTotalStyle,
  DataGridCells,
  MarketWithdrawalRequestsContainer,
  MarketWithdrawalRequetstCell,
} from "./style"
import Copy from "../../../../../../../assets/icons/copy_icon.svg"
import LinkIcon from "../../../../../../../assets/icons/link_icon.svg"
import { useGetWithdrawals } from "../../hooks/useGetWithdrawals"

export const MarketWithdrawalRequests = ({
  market,
}: MarketWithdrawalRequestsProps) => {
  const { t } = useTranslation()
  const { data } = useGetWithdrawals(market)

  const expiredTotalAmount = data.expiredWithdrawalsTotalOwed
  const activeTotalAmount = data.activeWithdrawalsTotalOwed
  const totalAmount = expiredTotalAmount.add(activeTotalAmount)

  const activeTxRows: Array<WithdrawalTxRow> = []
  const expiredTxRows: Array<WithdrawalTxRow> = []

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
          <Typography variant="text3">{trimAddress(value)}</Typography>
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
      minWidth: 90,
      flex: 1,
      headerAlign: "right",
      align: "right",
    },
  ]
  return (
    <Box sx={MarketWithdrawalRequestsContainer}>
      <Typography variant="title3">Open Withdrawals</Typography>
      <Accordion
        sx={AccordionSummaryTotalStyle}
        arrowRight
        title="Total"
        chipValue={formatTokenWithCommas(totalAmount, { withSymbol: true })}
      >
        <Accordion
          title="Ongoing"
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
          ) : null}
        </Accordion>
        <Divider />
        <Accordion
          title="Outstanding from past cycles"
          chipValue={formatTokenWithCommas(expiredTotalAmount, {
            withSymbol: true,
          })}
        >
          {expiredTxRows.length ? (
            <DataGrid
              sx={DataGridCells}
              rows={expiredTxRows}
              columns={columns}
              columnHeaderHeight={40}
            />
          ) : null}
        </Accordion>
      </Accordion>
    </Box>
  )
}
