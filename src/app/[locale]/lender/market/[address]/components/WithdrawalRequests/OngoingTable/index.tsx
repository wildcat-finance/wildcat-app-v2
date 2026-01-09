import { useState } from "react"
import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { WithdrawalTxRow } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/interface"
import { DataGridCells } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/style"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { WithdrawalsMobileTableItem } from "@/components/Mobile/WithdrawalsMobileTableItem"
import { useMobileResolution } from "@/hooks/useMobileResolution"
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
  const isMobile = useMobileResolution()
  const ongoingRows: WithdrawalTxRow[] = withdrawals.flatMap((batch) =>
    batch.requests.map((withdrawal) => ({
      id: withdrawal.id,
      lender: withdrawal.address,
      transactionId: withdrawal.transactionHash,
      dateSubmitted: timestampToDateFormatted(withdrawal.blockTimestamp),
      amount: formatTokenWithCommas(
        withdrawal.getNormalizedTotalAmount(batch.batch),
        { withSymbol: true },
      ),
    })),
  )

  const renderContent = () => {
    if (ongoingRows.length === 0) {
      return (
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
      )
    }

    if (isMobile) {
      return (
        <Box>
          {ongoingRows.map(
            ({ id, lender, transactionId, amount, dateSubmitted }, index) => (
              <WithdrawalsMobileTableItem
                key={id}
                lender={lender}
                transactionId={transactionId}
                dateSubmitted={dateSubmitted}
                amount={amount}
                isLast={index === ongoingRows.length - 1}
              />
            ),
          )}
        </Box>
      )
    }

    return (
      <DataGrid
        sx={DataGridCells}
        rows={ongoingRows}
        columns={columns || []}
        columnHeaderHeight={40}
        autoHeight
      />
    )
  }

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
      chipValue={formatTokenWithCommas(totalAmount, { withSymbol: true })}
      chipColor={COLORS.whiteSmoke}
      chipValueColor={COLORS.blackRock}
    >
      {renderContent()}
    </DetailsAccordion>
  )
}
