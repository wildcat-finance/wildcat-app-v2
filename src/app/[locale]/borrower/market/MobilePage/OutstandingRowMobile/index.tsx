import { useState } from "react"

import { Box, Typography, useMediaQuery, useTheme } from "@mui/material"
import { WithdrawalBatch, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { OutstandingRow } from "../OutstandingRow"

export const OutstandingRowMobile = ({
  withdrawalBatches,
  totalAmount,
}: {
  withdrawalBatches: WithdrawalBatch[]
  totalAmount: TokenAmount
}) => {
  const [isOutstandingOpen, setIsOutstandingOpen] = useState(false)
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const rows = withdrawalBatches.flatMap((batch) =>
    batch.requests
      .filter((withdrawal) => withdrawal.getNormalizedAmountOwed(batch).gt(0))
      .map((withdrawal) => ({
        id: withdrawal.id,
        lender: withdrawal.address,
        transactionId: withdrawal.transactionHash,
        dateSubmitted: withdrawal.blockTimestamp,
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
      chipValue={formatTokenWithCommas(totalAmount, { withSymbol: true })}
      chipColor={COLORS.whiteSmoke}
      chipValueColor={COLORS.blackRock}
    >
      {rows.length ? (
        <Box display="flex" flexDirection="column">
          {rows.map((transaction) => (
            <OutstandingRow
              key={transaction.id}
              address={transaction.lender}
              amount={transaction.amount}
              timestamp={transaction.dateSubmitted}
            />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            padding: isMobile ? theme.spacing(0, 0.5) : theme.spacing(0, 2),
            marginBottom: "10px",
          }}
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            {t("marketWithdrawalRequests.noOutstanding")}
          </Typography>
        </Box>
      )}
    </DetailsAccordion>
  )
}
