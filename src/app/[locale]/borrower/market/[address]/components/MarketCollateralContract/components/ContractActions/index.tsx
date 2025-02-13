import { Box, Button, Typography } from "@mui/material"
import { Market, Token } from "@wildcatfi/wildcat-sdk"

import { LinkGroup } from "@/components/LinkComponent"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export type ContractActionsType = {
  market: Market
  token: Token | undefined
}

export type ContractActionsItemType = {
  label: string
  amount: string | number | undefined
  asset: string | undefined
  convertedAmount: string | number | undefined
  showButton: boolean
  buttonLabel: string
  buttonOnClick: () => void
  marginBottom?: string
}

export const ContractActionsItem = ({
  label,
  amount,
  asset,
  convertedAmount,
  showButton,
  buttonLabel,
  buttonOnClick,
  marginBottom,
}: ContractActionsItemType) => (
  <Box
    sx={{
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      marginBottom,
    }}
  >
    <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <Typography variant="text2">{label}</Typography>
      <TooltipButton value="TBD" />
    </Box>

    <Box
      sx={{
        width: "50%",
        padding: "12px 16px",
        backgroundColor: COLORS.hintOfRed,
        borderRadius: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Box>
        <Box sx={{ display: "flex", gap: "4px" }}>
          <Typography variant="text2">{amount}</Typography>
          <Typography variant="text4" marginTop="1px">
            {asset}
          </Typography>
        </Box>
        <Typography variant="text4" color={COLORS.santasGrey}>
          {convertedAmount}
        </Typography>
      </Box>

      {showButton && (
        <Button
          variant="contained"
          size="small"
          onClick={buttonOnClick}
          sx={{ height: "fit-content", width: "90px" }}
        >
          {buttonLabel}
        </Button>
      )}
    </Box>
  </Box>
)

export const ContractActions = ({ market, token }: ContractActionsType) => {
  const address = "0xca732651410e915090d7a7d889a1e44ef4575fce"

  const showDeposit = !market.isClosed
  const showLiquidate = market.isIncurringPenalties || market.isDelinquent
  const showReclaim = market.isClosed

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <Typography variant="text2">Collateral Address</Typography>

        <Box
          sx={{
            width: "50%",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 16px",
          }}
        >
          <Typography variant="text2">{trimAddress(address)}</Typography>
          <LinkGroup type="withCopy" linkValue={address} copyValue={address} />
        </Box>
      </Box>

      <ContractActionsItem
        amount={498.2}
        label="Market Delinquent Debt"
        showButton={showDeposit}
        buttonLabel="Deposit"
        buttonOnClick={() => {
          console.log("Test Deposit")
        }}
        asset={token?.symbol}
        convertedAmount={`0 ${market.underlyingToken.symbol}`}
        marginBottom="10px"
      />

      <ContractActionsItem
        amount={498.2}
        label="Amount Held"
        showButton={showLiquidate || showReclaim}
        buttonLabel={showReclaim ? "Reclaim" : "Liquidate"}
        buttonOnClick={
          showReclaim
            ? () => {
                console.log("Test Reclaim")
              }
            : () => {
                console.log("Test Liquidate")
              }
        }
        asset={token?.symbol}
        convertedAmount={`0 ${market.underlyingToken.symbol}`}
      />
    </Box>
  )
}
