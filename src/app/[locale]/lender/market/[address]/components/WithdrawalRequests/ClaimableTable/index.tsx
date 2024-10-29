import { useState } from "react"
import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"

import { WithdrawalTxRow } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/interface"
import { DataGridCells } from "@/app/[locale]/borrower/market/[address]/components/MarketWithdrawalRequests/style"
import { TableProps } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests/interface"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export const ClaimableTable = ({
  withdrawals,
  totalAmount,
  columns,
}: TableProps) => {
  const { t } = useTranslation()
  const [isClaimableOpen, setIsClaimableOpen] = useState(false)

  const claimableRows: WithdrawalTxRow[] = withdrawals.flatMap((batch) =>
    batch.requests
      .filter(
        (withdrawal) => !withdrawal.getNormalizedAmountOwed(batch.batch).gt(0),
      )
      .map((withdrawal) => ({
        id: withdrawal.id,
        lender: withdrawal.address,
        transactionId: withdrawal.transactionHash,
        dateSubmitted: dayjs(withdrawal.blockTimestamp * 1000).format(
          "DD-MMM-YYYY",
        ),
        amount: formatTokenWithCommas(
          withdrawal.getNormalizedAmountOwed(batch),
          {
            withSymbol: true,
          },
        ),
      })),
  )

  return (
    <DetailsAccordion
      isOpen={isClaimableOpen}
      setIsOpen={setIsClaimableOpen}
      summaryText={t("lenderMarketDetails.requests.claimable")}
      summarySx={{
        borderRadius: "0px",
        borderBottom: isClaimableOpen ? "none" : `1px solid`,
        borderColor: COLORS.athensGrey,
      }}
      chipValue={formatTokenWithCommas(totalAmount, {
        withSymbol: true,
      })}
      chipColor={COLORS.whiteSmoke}
      chipValueColor={COLORS.blackRock}
    >
      {claimableRows.length && columns ? (
        <DataGrid
          sx={DataGridCells}
          rows={claimableRows}
          columns={columns}
          columnHeaderHeight={40}
          getRowHeight={() => "auto"}
        />
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          padding="0 16px"
          marginBottom="10px"
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            There are no claimable withdrawals
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
