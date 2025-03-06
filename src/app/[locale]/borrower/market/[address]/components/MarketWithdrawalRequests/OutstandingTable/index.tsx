import { useState } from "react"
import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { TokenAmount, WithdrawalBatch } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import {
  formatTokenWithCommas,
  timestampToDateFormatted,
} from "@/utils/formatters"

import { WithdrawalTxRow } from "../interface"
import { DataGridCells } from "../style"

export type OngoingTableProps = {
  withdrawalBatches: WithdrawalBatch[]
  totalAmount: TokenAmount
  columns: GridColDef[]
}

export const OutstandingTable = ({
  withdrawalBatches,
  totalAmount,
  columns,
}: OngoingTableProps) => {
  const { t } = useTranslation()
  const [isOutstandingOpen, setIsOutstandingOpen] = useState(false)

  const outstandingRows: WithdrawalTxRow[] = withdrawalBatches.flatMap(
    (batch) =>
      batch.requests
        .filter((withdrawal) => withdrawal.getNormalizedAmountOwed(batch).gt(0))
        .map((withdrawal) => ({
          id: withdrawal.id,
          lender: withdrawal.address,
          transactionId: withdrawal.transactionHash,
          dateSubmitted: timestampToDateFormatted(withdrawal.blockTimestamp),
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
      summaryText="Outstanding From Past Cycles"
      summarySx={{
        borderRadius: "0px",
        borderBottom: isOutstandingOpen ? "none" : `1px solid`,
        borderColor: COLORS.athensGrey,
      }}
      chipValue={formatTokenWithCommas(totalAmount, {
        withSymbol: true,
      })}
      chipColor={COLORS.whiteSmoke}
      chipValueColor={COLORS.blackRock}
    >
      {outstandingRows.length ? (
        <DataGrid
          sx={DataGridCells}
          rows={outstandingRows}
          columns={columns}
          columnHeaderHeight={40}
        />
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          padding="0 16px"
          marginBottom="10px"
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            {t("marketWithdrawalRequests.noOutstanding")}
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
