import * as React from "react"
import { useState } from "react"

import { Box, IconButton, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import {
  LenderWithdrawalStatus,
  TokenAmount,
  WithdrawalBatch,
} from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import Link from "next/link"

import LinkIcon from "@/assets/icons/link_icon.svg"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas, trimAddress } from "@/utils/formatters"

import { DataGridCells, MarketWithdrawalRequetstCell } from "../style"

export type ClaimableTableProps = {
  withdrawalBatches: WithdrawalBatch[]
  totalAmount: TokenAmount
}

const lendersName: { [key: string]: string } = JSON.parse(
  localStorage.getItem("lenders-name") || "{}",
)

const claimableColumns: GridColDef[] = [
  {
    sortable: false,
    field: "lender",
    headerName: "Lender",
    minWidth: 176,
    headerAlign: "left",
    align: "left",
    renderCell: ({ value }) => (
      <Box
        sx={{
          height: "100%",
          padding: "16px 0",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
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
    renderCell: ({ value }) => (
      <Box
        sx={{
          height: "100%",
          padding: "16px 0",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {value
          .filter(
            (date: string, index: number, self: string[]) =>
              self.indexOf(date) === index,
          )
          .map((date: string) => (
            <Typography variant="text3" key={date}>
              {date}
            </Typography>
          ))}
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexWrap: "wrap",
          gap: "20px",
          padding: "16px 0",
        }}
      >
        {value.map((txID: string) => (
          <Box sx={MarketWithdrawalRequetstCell}>
            <Typography variant="text3">{trimAddress(txID)}</Typography>

            <LinkGroup
              linkValue={`${EtherscanBaseUrl}/tx/${txID}`}
              copyValue={txID}
            />
          </Box>
        ))}
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
    renderCell: ({ value }) => (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexWrap: "wrap",
          gap: "20px",
          padding: "16px 0",
        }}
      >
        {value.map((amount: string) => (
          <Box sx={MarketWithdrawalRequetstCell}>
            <Typography variant="text3">{amount}</Typography>
          </Box>
        ))}
      </Box>
    ),
  },
]

export const ClaimableTable = ({
  withdrawalBatches,
  totalAmount,
}: ClaimableTableProps) => {
  const [isClaimableOpen, setIsClaimableOpen] = useState(false)

  const getClaimableRequestAmounts = (status: LenderWithdrawalStatus) => {
    const claimableAmount = status.availableWithdrawalAmount
    return status.requests.flatMap((request) =>
      formatTokenWithCommas(
        claimableAmount.mulDiv(request.scaledAmount, status.scaledAmount),
        {
          withSymbol: true,
        },
      ),
    )
  }

  const claimableRows = withdrawalBatches.flatMap((batch) =>
    batch.withdrawals.map((withdrawal) => ({
      id: withdrawal.scaledAmount,
      lender: withdrawal.lender,
      transactionId: withdrawal.requests.map(
        (request) => request.transactionHash,
      ),
      dateSubmitted: withdrawal.requests.map((request) =>
        dayjs(request.blockTimestamp * 1000).format("DD-MMM-YYYY"),
      ),
      amount: getClaimableRequestAmounts(withdrawal),
    })),
  )

  return (
    <DetailsAccordion
      isOpen={isClaimableOpen}
      setIsOpen={setIsClaimableOpen}
      summaryText="Claimable"
      summarySx={{
        borderRadius: "0px",
        borderBottom: isClaimableOpen ? "none" : `1px solid`,
        borderColor: COLORS.athensGrey,
      }}
      chipValue={formatTokenWithCommas(totalAmount, {
        withSymbol: true,
      })}
      chipColor={COLORS.whiteSmoke}
      chipValueColor={COLORS.blackRock}
    >
      {claimableRows.length ? (
        <DataGrid
          sx={DataGridCells}
          rows={claimableRows}
          columns={claimableColumns}
          columnHeaderHeight={40}
          getRowHeight={() => "auto"}
        />
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          padding="0 16px"
          marginBottom="10px"
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            There are no claimable withdrawals
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
