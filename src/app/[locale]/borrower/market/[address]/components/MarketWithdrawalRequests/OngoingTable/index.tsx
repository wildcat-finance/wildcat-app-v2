import { useState } from "react"
import * as React from "react"

import { Box, Typography, useMediaQuery, useTheme } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { TokenAmount, WithdrawalBatch } from "@wildcatfi/wildcat-sdk"
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
  const isMobile = useMobileResolution()

  const ongoingRows: WithdrawalTxRow[] = withdrawalBatches.flatMap((batch) =>
    batch.requests.map((withdrawal) => ({
      id: withdrawal.id,
      lender: withdrawal.address,
      transactionId: withdrawal.transactionHash,
      dateSubmitted: timestampToDateFormatted(withdrawal.blockTimestamp),
      amount: formatTokenWithCommas(
        withdrawal.getNormalizedTotalAmount(batch),
        {
          withSymbol: true,
        },
      ),
    })),
  )

  const renderContent = () => {
    if (!ongoingRows.length) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            padding: isMobile ? "0px 4px" : "0px 16px",
            marginBottom: isMobile ? "0px" : "10px",
          }}
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            {t("marketWithdrawalRequests.noOngoing")}
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
                amount={amount}
                dateSubmitted={dateSubmitted}
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
        columns={columns}
        columnHeaderHeight={40}
        autoHeight
      />
    )
  }

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
      {renderContent()}
    </DetailsAccordion>
  )
}
