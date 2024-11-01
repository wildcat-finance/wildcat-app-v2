import { useState } from "react"
import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"

import { WithdrawalTxRow } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/interface"
import { DataGridCells } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/style"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { TableProps } from "../interface"

export const OngoingTable = ({
  withdrawals,
  totalAmount,
  columns,
}: TableProps) => {
  const { t } = useTranslation()
  const [isOngoingOpen, setIsOngoingOpen] = useState(false)

  const ongoingRows: WithdrawalTxRow[] = withdrawals.flatMap((batch) =>
    batch.requests.map((withdrawal) => ({
      id: withdrawal.id,
      lender: withdrawal.address,
      transactionId: withdrawal.transactionHash,
      dateSubmitted: dayjs(withdrawal.blockTimestamp * 1000).format(
        "DD-MMM-YYYY",
      ),
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
          padding="0 16px"
          marginBottom="10px"
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            There are no ongoing withdrawals
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
