import { useState } from "react"
import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { TokenAmount, WithdrawalBatch } from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"

import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { WithdrawalTxRow } from "../interface"
import { DataGridCells } from "../style"

export type OngoingTableProps = {
  withdrawalBatches: WithdrawalBatch[]
  totalAmount: TokenAmount
  isIncurringPenalties: boolean
  columns: GridColDef[]
}

export const OutstandingTable = ({
  withdrawalBatches,
  totalAmount,
  isIncurringPenalties,
  columns,
}: OngoingTableProps) => {
  const [isOutstandingOpen, setIsOutstandingOpen] = useState(false)

  const outstandingRows: WithdrawalTxRow[] = withdrawalBatches.flatMap(
    (batch) =>
      batch.requests
        .filter((withdrawal) => withdrawal.getNormalizedAmountOwed(batch).gt(0))
        .map((withdrawal) => ({
          id: withdrawal.id,
          lender: withdrawal.address,
          transactionId: withdrawal.transactionHash,
          dateSubmitted: dayjs(withdrawal.blockTimestamp * 1000).format(
            "DD-MMM-YYYY",
          ),
          amount: formatTokenWithCommas(
            withdrawal.getNormalizedAmountOwed(batch),
            { withSymbol: true },
          ),
        })),
  )

  return (
    <DetailsAccordion
      isOpen={isOutstandingOpen}
      setIsOpen={setIsOutstandingOpen}
      summaryText="Outstanding from past cycles"
      summarySx={{
        borderRadius: "0px",
        marginBottom: isOutstandingOpen ? "0px" : "12px",
        borderBottom: isOutstandingOpen ? "none" : `1px solid`,
        borderColor: COLORS.athensGrey,
      }}
      chipValue={formatTokenWithCommas(totalAmount, {
        withSymbol: true,
      })}
      chipColor={isIncurringPenalties ? COLORS.remy : COLORS.whiteSmoke}
      chipValueColor={isIncurringPenalties ? COLORS.dullRed : COLORS.blackRock}
    >
      {outstandingRows.length ? (
        <DataGrid
          sx={DataGridCells}
          rows={outstandingRows}
          columns={columns}
          columnHeaderHeight={40}
        />
      ) : (
        <Box display="flex" flexDirection="column" padding="0 16px">
          <Typography variant="text3" color={COLORS.santasGrey}>
            There are no outstanding withdrawals from past cycles
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
