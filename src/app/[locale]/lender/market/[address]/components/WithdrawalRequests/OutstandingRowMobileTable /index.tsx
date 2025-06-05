import { useState } from "react"

import { Box, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useTranslation } from "react-i18next"

import { OutstandingRow } from "@/app/[locale]/borrower/market/MobilePage/OutstandingRow"
import { TableProps } from "@/app/[locale]/lender/market/[address]/components/WithdrawalRequests/interface"
import { DetailsAccordion } from "@/components/Accordion/DetailsAccordion"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export const OutstandingRowMobileTable = ({
  withdrawals,
  totalAmount,
}: Omit<TableProps, "columns">) => {
  const [isOutstandingOpen, setIsOutstandingOpen] = useState(false)
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  const rows = withdrawals.flatMap((status) =>
    status.requests
      .filter((wd) => wd.getNormalizedAmountOwed(status.batch).gt(0))
      .map((withdrawal) => ({
        id: withdrawal.id,
        lender: withdrawal.address,
        transactionId: withdrawal.transactionHash,
        dateSubmitted: withdrawal.blockTimestamp,
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
      chipValue={formatTokenWithCommas(totalAmount, { withSymbol: true })}
      chipColor={COLORS.whiteSmoke}
      chipValueColor={COLORS.blackRock}
    >
      {rows.length ? (
        <Box display="flex" flexDirection="column">
          {rows.map((item) => (
            <OutstandingRow
              key={item.id}
              address={item.lender}
              amount={item.amount}
              timestamp={item.dateSubmitted}
            />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            padding: isMobile ? "0px 4px" : "0px 16px",
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
