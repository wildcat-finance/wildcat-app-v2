import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Link as MuiLink,
  SvgIcon,
  Typography,
} from "@mui/material"
import { MarketAccount, MarketCollateralV1 } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import BackArrow from "@/assets/icons/backArrow_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { DepositModalContract } from "@/components/MarketCollateralContract/components/DepositModal"
import { LiquidateCollateralModal } from "@/components/MarketCollateralContract/components/LiquidateModal"
import { TooltipButton } from "@/components/TooltipButton"
import { EtherscanBaseUrl } from "@/config/network"
import { useGetBebopTokens } from "@/hooks/bebop/useGetBebopTokens"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useUpdatedCollateralContract } from "@/hooks/useGetCollateralContracts"
import { COLORS } from "@/theme/colors"
import { TOKEN_FORMAT_DECIMALS, trimAddress } from "@/utils/formatters"

import { CollateralActionsItem } from "../CollateralActionsItem"
import { ReclaimModalContract } from "../ReclaimModal"

export type ContractActionsType = {
  marketAccount: MarketAccount
  collateralContract: MarketCollateralV1
  hideActions?: boolean
}

export const ContractActions = ({
  marketAccount,
  collateralContract: inputCollateralContract,
  hideActions,
}: ContractActionsType) => {
  const { market } = marketAccount
  const { t } = useTranslation()
  const { collateral: collateralContract, depositor } =
    useUpdatedCollateralContract(inputCollateralContract)
  const { isTestnet } = useCurrentNetwork()
  const { data: bebopTokens } = useGetBebopTokens()
  const collateralTokenFromBebop = bebopTokens?.find(
    (token) =>
      token.address === collateralContract.collateralAsset.address ||
      (isTestnet &&
        token.symbol.toLowerCase() ===
          collateralContract.collateralAsset.symbol.toLowerCase()),
  )

  const showDeposit = !market.isClosed && !hideActions

  const showLiquidate =
    market.isIncurringPenalties &&
    collateralContract.availableCollateral.gt(0) &&
    !hideActions

  const showReclaim =
    market.isClosed && depositor && depositor.sharesValue.gt(0) && !hideActions

  const collateralValue =
    collateralTokenFromBebop &&
    +collateralContract.availableCollateral.format() *
      (collateralTokenFromBebop.priceUsd ?? 0)

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
          marginBottom: "28px",
        }}
      >
        <Typography variant="text2">
          {t("collateral.actions.address")}
        </Typography>

        <Box
          sx={{
            width: "50%",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "0 16px",
          }}
        >
          <Typography variant="text2">
            {trimAddress(collateralContract.address)}
          </Typography>
          <LinkGroup
            type="withCopy"
            linkValue={`${EtherscanBaseUrl}/address/${collateralContract.address}`}
            copyValue={collateralContract.address}
          />
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <Typography variant="text2">{t("collateral.actions.asset")}</Typography>

        <Box
          sx={{
            width: "50%",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "0 16px",
          }}
        >
          <Typography variant="text2">
            {collateralContract.collateralAsset.name}
          </Typography>
          <LinkGroup
            type="withCopy"
            linkValue={`${EtherscanBaseUrl}/address/${collateralContract.collateralAsset.address}`}
            copyValue={collateralContract.collateralAsset.address}
          />
        </Box>
      </Box>

      <CollateralActionsItem
        amount={market.delinquentDebt.format(TOKEN_FORMAT_DECIMALS)}
        label={t("collateral.actions.delinquentDebt")}
        tooltip="TBD"
        asset={market.underlyingToken.symbol}
        convertedAmount={`0 ${collateralContract.collateralAsset.symbol}`}
        marginBottom="8px"
      >
        {showLiquidate && (
          <LiquidateCollateralModal collateral={collateralContract} />
        )}
        {showReclaim && (
          <ReclaimModalContract
            market={market}
            collateralContract={collateralContract}
            depositor={depositor}
          />
        )}
      </CollateralActionsItem>

      <CollateralActionsItem
        amount={collateralContract.availableCollateral.format(
          TOKEN_FORMAT_DECIMALS,
        )}
        label={t("collateral.actions.availableCollateral")}
        tooltip="TBD"
        asset={collateralContract.collateralAsset.symbol}
        convertedAmount={
          collateralValue !== undefined ? `$${collateralValue.toFixed(2)}` : "0"
        }
        marginBottom="8px"
      >
        {showDeposit && (
          <DepositModalContract
            marketAccount={marketAccount}
            collateralContract={collateralContract}
          />
        )}
      </CollateralActionsItem>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Typography variant="text2">
            {t("collateral.actions.yourShares")}
          </Typography>
          <TooltipButton value="TBD" />
        </Box>

        <Box
          sx={{
            width: "50%",
            padding: "12px 16px",
            backgroundColor: COLORS.hintOfRed,
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Typography variant="text2">
              20 <span style={{ color: COLORS.santasGrey }}>/ 50 shares</span>
            </Typography>
            <Typography variant="text4" color={COLORS.santasGrey}>
              0 USDC
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={40}
            sx={{
              marginTop: "20px",
              height: "3px",
              backgroundColor: COLORS.whiteLilac,
              borderRadius: "50px",
              "& .MuiLinearProgress-bar1Determinate": {
                backgroundColor: COLORS.ultramarineBlue,
              },
            }}
          />
        </Box>
      </Box>

      {/* {depositor && depositor.sharesValue.gt(0) && ( */}
      {/*  <CollateralActionsItem */}
      {/*    amount={`${collateralContract.collateralAsset */}
      {/*      .getAmount(depositor.shares) */}
      {/*      .format()} shares of ${collateralContract.collateralAsset */}
      {/*      .getAmount(collateralContract.totalShares) */}
      {/*      .format()} total`} */}
      {/*    label={t("collateral.actions.yourShares")} */}
      {/*    asset={undefined} */}
      {/*    convertedAmount={depositor.sharesValue.format( */}
      {/*      depositor.sharesValue.token.decimals, */}
      {/*      true, */}
      {/*    )} */}
      {/*  > */}
      {/*    {showReclaim && ( */}
      {/*      <ReclaimModalContract */}
      {/*        market={market} */}
      {/*        collateralContract={collateralContract} */}
      {/*        depositor={depositor} */}
      {/*      /> */}
      {/*    )} */}
      {/*  </CollateralActionsItem> */}
      {/* )} */}
    </Box>
  )
}
