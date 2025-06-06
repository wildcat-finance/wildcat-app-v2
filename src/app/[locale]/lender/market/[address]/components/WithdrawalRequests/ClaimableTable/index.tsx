import { useState } from "react"
import * as React from "react"

import {
  Box,
  IconButton,
  SvgIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { LenderWithdrawalStatus } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import {
  DataGridCells,
  MarketWithdrawalRequetstCell,
} from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/style"
import { TableProps } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests/interface"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { LinkGroup } from "@/components/LinkComponent"
import { WithdrawalsMobileTableItem } from "@/components/Mobile/WithdrawalsMobileTableItem"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import {
  formatTokenWithCommas,
  timestampToDateFormatted,
  trimAddress,
} from "@/utils/formatters"

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

export const ClaimableTable = ({ withdrawals, totalAmount }: TableProps) => {
  const { t } = useTranslation()
  const [isClaimableOpen, setIsClaimableOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  const expiredPendingWithdrawals: {
    [key: string]: LenderWithdrawalStatus[]
  } = {}

  withdrawals.forEach((batch) => {
    if (batch.availableWithdrawalAmount.raw.isZero()) {
      return
    }

    if (!expiredPendingWithdrawals[batch.lender]) {
      expiredPendingWithdrawals[batch.lender] = []
    }

    expiredPendingWithdrawals[batch.lender].push(batch)
  })

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

  const claimableRows = Object.keys(expiredPendingWithdrawals).flatMap(
    (lender) =>
      expiredPendingWithdrawals[lender].map((withdrawal, index) => ({
        id: `${withdrawal.lender}-${withdrawal.scaledAmount}-${index}`, // Уникальный id
        lender: withdrawal.lender,
        transactionId: withdrawal.requests.map(
          (request) => request.transactionHash,
        ),
        dateSubmitted: withdrawal.requests.map((request) =>
          timestampToDateFormatted(request.blockTimestamp),
        ),
        amount: getClaimableRequestAmounts(withdrawal),
      })),
  )

  console.log(claimableRows, "claimableRows")

  return (
    <DetailsAccordion
      isOpen={isClaimableOpen}
      setIsOpen={setIsClaimableOpen}
      summaryText={t("lenderMarketDetails.requests.claimable")}
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
      {(() => {
        if (!claimableRows.length) {
          return (
            <Box
              display="flex"
              flexDirection="column"
              padding={isMobile ? "0 4px" : "0 16px"}
              marginBottom={isMobile ? "0px" : "10px"}
            >
              <Typography variant="text3" color={COLORS.santasGrey}>
                No claimable withdrawals.
              </Typography>
            </Box>
          )
        }

        if (isMobile) {
          return (
            <Box>
              {claimableRows.map(
                ({ id, lender, transactionId, amount, dateSubmitted }) =>
                  transactionId.map((txId, idx) => (
                    <WithdrawalsMobileTableItem
                      key={`${id.toString()}_${txId}`}
                      lender={lender}
                      transactionId={txId}
                      amount={amount[idx]}
                      dateSubmitted={dateSubmitted[idx]}
                    />
                  )),
              )}
            </Box>
          )
        }

        return (
          <DataGrid
            sx={DataGridCells}
            rows={claimableRows}
            columns={claimableColumns}
            columnHeaderHeight={40}
            getRowHeight={() => "auto"}
          />
        )
      })()}
    </DetailsAccordion>
  )
}
