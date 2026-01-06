import { useMemo, useState } from "react"
import * as React from "react"

import { Box, IconButton, SvgIcon, Typography, useTheme } from "@mui/material"
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
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import {
  formatTokenWithCommas,
  timestampToDateFormatted,
  trimAddress,
} from "@/utils/formatters"

export const ClaimableTable = ({ withdrawals, totalAmount }: TableProps) => {
  const { t } = useTranslation()
  const [isClaimableOpen, setIsClaimableOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMobileResolution()
  const { getAddressUrl, getTxUrl } = useBlockExplorer()

  const claimableColumns: GridColDef[] = useMemo(
    () => [
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
        renderCell: ({ value, row }) => (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              flexWrap: "wrap",
              gap: "20px",
              padding: "16px 0",
            }}
          >
            {value.map((date: string, index: number) => (
              <Box
                sx={MarketWithdrawalRequetstCell}
                key={row.transactionId?.[index] ?? `${date}-${index}`}
              >
                <Typography variant="text3">{date}</Typography>
              </Box>
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

                <LinkGroup linkValue={getTxUrl(txID)} copyValue={txID} />
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
    ],
    [getAddressUrl, getTxUrl],
  )

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

  const claimableRows = Object.keys(expiredPendingWithdrawals).flatMap(
    (lender) =>
      expiredPendingWithdrawals[lender].flatMap((withdrawal, index) => {
        const claimableAmount = withdrawal.availableWithdrawalAmount
        const requests = withdrawal.requests
          .map((request) => {
            const amount = claimableAmount.mulDiv(
              request.scaledAmount,
              withdrawal.scaledAmount,
            )
            return {
              ...request,
              amount,
            }
          })
          .filter((req) => req.amount.gt(0))

        if (requests.length === 0) return []

        return [
          {
            id: `${withdrawal.lender}-${withdrawal.scaledAmount}-${index}`,
            lender: withdrawal.lender,
            transactionId: requests.map((request) => request.transactionHash),
            dateSubmitted: requests.map((request) =>
              timestampToDateFormatted(request.blockTimestamp),
            ),
            amount: requests.map((request) =>
              formatTokenWithCommas(request.amount, {
                withSymbol: true,
                fractionDigits: request.amount.decimals,
              }),
            ),
          },
        ]
      }),
  )

  const renderContent = () => {
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
      const mobileRows = claimableRows.flatMap(
        ({ id, lender, transactionId, amount, dateSubmitted }) =>
          transactionId.map((txId, idx) => ({
            key: `${id.toString()}_${txId}`,
            lender,
            transactionId: txId,
            amount: amount[idx],
            dateSubmitted: dateSubmitted[idx],
          })),
      )

      return (
        <Box>
          {mobileRows.map((row, index) => (
            <WithdrawalsMobileTableItem
              key={row.key}
              lender={row.lender}
              transactionId={row.transactionId}
              amount={row.amount}
              dateSubmitted={row.dateSubmitted}
              isLast={index === mobileRows.length - 1}
            />
          ))}
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
        autoHeight
      />
    )
  }

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
      {renderContent()}
    </DetailsAccordion>
  )
}
