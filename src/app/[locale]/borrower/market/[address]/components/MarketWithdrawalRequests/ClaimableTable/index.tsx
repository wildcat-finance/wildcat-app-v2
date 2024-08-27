import { useState } from "react"
import * as React from "react"

import { Box, IconButton, Link, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { TokenAmount, WithdrawalBatch } from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"

import Copy from "@/assets/icons/copy_icon.svg"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
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
            <IconButton disableRipple sx={AddressButtons} onClick={() => {}}>
              <SvgIcon fontSize="medium">
                <Copy />
              </SvgIcon>
            </IconButton>
            <Link
              href={`${EtherscanBaseUrl}/address/${txID}`}
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
        ))}
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
    renderCell: ({ value }) => (
      <Box>
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
    field: "amount",
    headerName: "Amount",
    minWidth: 120,
    flex: 1,
    headerAlign: "right",
    align: "right",
  },
]

export const ClaimableTable = ({
  withdrawalBatches,
  totalAmount,
}: ClaimableTableProps) => {
  const [isClaimableOpen, setIsClaimableOpen] = useState(false)

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
      amount: formatTokenWithCommas(withdrawal.availableWithdrawalAmount, {
        withSymbol: true,
      }),
    })),
  )

  return (
    <DetailsAccordion
      isOpen={isClaimableOpen}
      setIsOpen={setIsClaimableOpen}
      summaryText="Claimable"
      summarySx={{
        borderRadius: "0px",
        marginBottom: isClaimableOpen ? "0px" : "12px",
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
        <Box display="flex" flexDirection="column" padding="0 16px">
          <Typography variant="text3" color={COLORS.santasGrey}>
            There are no claimable withdrawals
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
