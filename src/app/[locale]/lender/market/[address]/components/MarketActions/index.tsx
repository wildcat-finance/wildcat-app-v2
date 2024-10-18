import * as React from "react"

import { Box, Button, Divider } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { StatementModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/StatementModal"
import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { WithdrawModal } from "@/app/[locale]/lender/market/[address]/components/Modals/WithdrawModal"
import { useAddToken } from "@/app/[locale]/lender/market/[address]/hooks/useAddToken"
import { TransactionBlock } from "@/components/TransactionBlock"
import { formatTokenWithCommas } from "@/utils/formatters"

export type MarketActionsProps = {
  marketAccount: MarketAccount
}

export const MarketActions = ({ marketAccount }: MarketActionsProps) => {
  const { market } = marketAccount

  const [isStatementOpen, setIsStatementOpen] = React.useState(false)

  const { canAddToken, handleAddToken, isAddingToken } = useAddToken(
    market?.marketToken,
  )

  const handleOpenStatement = () => {
    setIsStatementOpen(true)
  }

  const hideDeposit =
    market.isClosed || marketAccount.maximumDeposit.raw.isZero()

  const hideWithdraw =
    market.isClosed || marketAccount.marketBalance.raw.isZero()

  return (
    <>
      <Box display="flex" columnGap="6px">
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={() => handleAddToken()}
          disabled={isAddingToken && canAddToken}
        >
          Add Token to Wallet
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={handleOpenStatement}
        >
          Download Statement
        </Button>

        <StatementModal
          isOpen={isStatementOpen}
          setIsOpen={setIsStatementOpen}
        />
      </Box>

      <Divider sx={{ margin: "32px 0" }} />

      <Box
        sx={{
          width: "100%",
          maxWidth: "807px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <TransactionBlock
          title="Available to deposit"
          tooltip="TBD"
          amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
          asset={market.underlyingToken.symbol}
        >
          {!hideDeposit && <DepositModal marketAccount={marketAccount} />}
        </TransactionBlock>

        <TransactionBlock
          title="Available to withdraw"
          tooltip="TBD"
          amount={formatTokenWithCommas(marketAccount.marketBalance)}
          asset={market.underlyingToken.symbol}
        >
          {!hideWithdraw && <WithdrawModal marketAccount={marketAccount} />}
        </TransactionBlock>
      </Box>
    </>
  )
}
