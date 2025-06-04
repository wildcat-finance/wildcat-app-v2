import { useState } from "react"
import * as React from "react"

import { Box, Typography, useMediaQuery, useTheme } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { WithdrawalTxRow } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/interface"
import { DataGridCells } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/style"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { COLORS } from "@/theme/colors"
import {
  formatTokenWithCommas,
  timestampToDateFormatted,
} from "@/utils/formatters"

import { TableProps } from "../interface"

export const OngoingTable = ({
  withdrawals,
  totalAmount,
  columns,
}: TableProps) => {
  const { t } = useTranslation()
  const [isOngoingOpen, setIsOngoingOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const ongoingRows: WithdrawalTxRow[] = withdrawals.flatMap((batch) =>
    batch.requests.map((withdrawal) => ({
      id: withdrawal.id,
      lender: withdrawal.address,
      transactionId: withdrawal.transactionHash,
      dateSubmitted: timestampToDateFormatted(withdrawal.blockTimestamp),
      amount: formatTokenWithCommas(
        withdrawal.getNormalizedTotalAmount(batch.batch),
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
      summaryText={t("lenderMarketDetails.requests.ongoing")}
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
      {ongoingRows.length && columns ? (
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
          padding={isMobile ? "0 4px" : "0 16px"}
          marginBottom={isMobile ? "0px" : "10px"}
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            No ongoing withdrawals.
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
