import { useState } from "react"
import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { DataGridCells } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/style"
import { TableProps } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests/interface"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { WithdrawalsMobileTableItem } from "@/components/Mobile/WithdrawalsMobileTableItem"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import {
  formatTokenWithCommas,
  timestampToDateFormatted,
} from "@/utils/formatters"

export const OutstandingTable = ({
  withdrawals,
  totalAmount,
  columns,
}: TableProps) => {
  const { t } = useTranslation()
  const [isOutstandingOpen, setIsOutstandingOpen] = useState(false)
  const isMobile = useMobileResolution()

  const outstandingRows = withdrawals.flatMap((status) =>
    status.requests
      .filter((wd) => wd.getNormalizedAmountOwed(status.batch).gt(0))
      .map((withdrawal) => ({
        id: withdrawal.id,
        lender: withdrawal.address,
        transactionId: withdrawal.transactionHash,
        dateSubmitted: timestampToDateFormatted(withdrawal.blockTimestamp),
        amount: formatTokenWithCommas(
          withdrawal.getNormalizedAmountOwed(status.batch),
          { withSymbol: true },
        ),
      })),
  )

  const renderContent = () => {
    if (!outstandingRows.length) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          padding={isMobile ? "0 4px" : "0 16px"}
          marginBottom={isMobile ? "0px" : "10px"}
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            No withdrawal requests from previous cycles.
          </Typography>
        </Box>
      )
    }

    if (isMobile) {
      return (
        <Box>
          {outstandingRows.map(
            ({ id, lender, transactionId, amount, dateSubmitted }, index) => (
              <WithdrawalsMobileTableItem
                key={id}
                lender={lender}
                transactionId={transactionId}
                amount={amount}
                dateSubmitted={dateSubmitted}
                isLast={index === outstandingRows.length - 1}
              />
            ),
          )}
        </Box>
      )
    }

    return (
      <DataGrid
        sx={DataGridCells}
        rows={outstandingRows}
        columns={columns || []}
        columnHeaderHeight={40}
        autoHeight
      />
    )
  }

  return (
    <DetailsAccordion
      isOpen={isOutstandingOpen}
      setIsOpen={setIsOutstandingOpen}
      summaryText={t("lenderMarketDetails.requests.outstanding")}
      summarySx={{
        borderRadius: "0px",
        borderBottom: isOutstandingOpen || isMobile ? "none" : `1px solid`,
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
