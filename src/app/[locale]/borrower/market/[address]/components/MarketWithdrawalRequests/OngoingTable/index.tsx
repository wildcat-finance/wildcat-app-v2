import { useState } from "react"
import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { TokenAmount, WithdrawalBatch } from "@wildcatfi/wildcat-sdk"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"

import { WithdrawalTxRow } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/interface"
import { DataGridCells } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/style"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export type OngoingTableProps = {
  withdrawalBatches: WithdrawalBatch[]
  totalAmount: TokenAmount
  columns: GridColDef[]
}

export const OngoingTable = ({
  withdrawalBatches,
  totalAmount,
  columns,
}: OngoingTableProps) => {
  const { t } = useTranslation()
  const [isOngoingOpen, setIsOngoingOpen] = useState(false)

  const ongoingRows: WithdrawalTxRow[] = withdrawalBatches.flatMap((batch) =>
    batch.requests.map((withdrawal) => ({
      id: withdrawal.id,
      lender: withdrawal.address,
      transactionId: withdrawal.transactionHash,
      dateSubmitted: dayjs(withdrawal.blockTimestamp * 1000).format(
        "DD-MMM-YYYY",
      ),
      amount: formatTokenWithCommas(
        withdrawal.getNormalizedTotalAmount(batch),
        {
          withSymbol: true,
        },
      ),
    })),
  )

  return (
    <DetailsAccordion
      isOpen={isOngoingOpen}
      setIsOpen={setIsOngoingOpen}
      summaryText="Ongoing"
      summarySx={{
        borderRadius: "0px",
        borderBottom: isOngoingOpen ? "none" : `1px solid`,
        borderColor: COLORS.athensGrey,
      }}
      chipValue={formatTokenWithCommas(totalAmount, {
        withSymbol: true,
      })}
      chipColor={COLORS.whiteSmoke}
      chipValueColor={COLORS.blackRock}
    >
      {ongoingRows.length ? (
        <DataGrid
          sx={DataGridCells}
          rows={ongoingRows}
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
            {t("marketWithdrawalRequests.noOngoing")}
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
