import { useState } from "react"
import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"

import { DataGridCells } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/style"
import { TableProps } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests/interface"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export const OutstandingTable = ({
  withdrawals,
  totalAmount,
  columns,
}: TableProps) => {
  const { t } = useTranslation()
  const [isOutstandingOpen, setIsOutstandingOpen] = useState(false)

  const outstandingRows = withdrawals.flatMap((status) =>
    status.requests
      .filter((wd) => wd.getNormalizedAmountOwed(status.batch).gt(0))
      .map((withdrawal) => ({
        id: withdrawal.id,
        lender: withdrawal.address,
        transactionId: withdrawal.transactionHash,
        dateSubmitted: dayjs(withdrawal.blockTimestamp * 1000).format(
          "DD-MMM-YYYY",
        ),
        amount: formatTokenWithCommas(
          withdrawal.getNormalizedAmountOwed(status.batch),
          { withSymbol: true },
        ),
      })),
  )

  return (
    <DetailsAccordion
      isOpen={isOutstandingOpen}
      setIsOpen={setIsOutstandingOpen}
      summaryText={t("lenderMarketDetails.requests.outstanding")}
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
      {outstandingRows.length && columns ? (
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
            No withdrawal requests from previous cycles.
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
