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

export type ClaimableTableProps = {
  withdrawalBatches: WithdrawalBatch[]
  totalAmount: TokenAmount
  columns: GridColDef[]
}

export const ClaimableTable = ({
  withdrawalBatches,
  totalAmount,
  columns,
}: ClaimableTableProps) => {
  const [isClaimableOpen, setIsClaimableOpen] = useState(false)

  const claimableRows: WithdrawalTxRow[] = withdrawalBatches.flatMap((batch) =>
    batch.requests.map((req) => ({
      id: req.id,
      lender: req.address,
      transactionId: req.transactionHash,
      dateSubmitted: dayjs(req.blockTimestamp * 1000).format("DD-MMM-YYYY"),
      amount: formatTokenWithCommas(req.normalizedAmount, {
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
          columns={columns}
          columnHeaderHeight={40}
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
