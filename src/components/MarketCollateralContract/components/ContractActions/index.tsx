import * as React from "react"

import { Box, LinearProgress, Skeleton, Typography } from "@mui/material"
import { MarketAccount, MarketCollateralV1 } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { LinkGroup } from "@/components/LinkComponent"
import { DepositModalContract } from "@/components/MarketCollateralContract/components/DepositModal"
import { LiquidateCollateralModal } from "@/components/MarketCollateralContract/components/LiquidateModal"
import { TooltipButton } from "@/components/TooltipButton"
import { EtherscanBaseUrl } from "@/config/network"
import { useGetBebopTokens } from "@/hooks/bebop/useGetBebopTokens"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useUpdatedCollateralContract } from "@/hooks/useGetCollateralContracts"
import { useGetTokenPrices } from "@/hooks/useGetTokenPrices"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import {
  getTokenValueSuffix,
  TOKEN_FORMAT_DECIMALS,
  trimAddress,
} from "@/utils/formatters"

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
  const isMobile = useMobileResolution()
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

  const { data: tokenPrices, isPending } = useGetTokenPrices([
    market.underlyingToken,
    collateralContract.collateralAsset,
  ])

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

  if (isMobile)
    return (
      <>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "2px",
            }}
          >
            <Typography variant="mobText3">
              {t("collateral.actions.delinquentDebt")}
            </Typography>
            <TooltipButton value="TBD" color={COLORS.bunker} />
          </Box>

          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: "4px",
              }}
            >
              <Typography
                variant="mobH3"
                sx={{ fontSize: "18px", lineHeight: "24px" }}
              >
                {market.delinquentDebt.format(TOKEN_FORMAT_DECIMALS)}
              </Typography>
              <Typography
                variant="mobText4"
                sx={{
                  marginTop: "1px",
                }}
              >
                {market.underlyingToken.symbol}
              </Typography>
            </Box>

            {isPending ? (
              <Skeleton
                sx={{ height: "16px", width: "42px", borderRadius: "6px" }}
              />
            ) : (
              <Typography variant="mobText4" color={COLORS.santasGrey}>
                {getTokenValueSuffix(market.delinquentDebt, tokenPrices)}
              </Typography>
            )}
          </Box>
        </Box>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "2px",
            }}
          >
            <Typography variant="mobText3">
              {t("collateral.actions.availableCollateral")}
            </Typography>
            <TooltipButton value="TBD" color={COLORS.bunker} />
          </Box>

          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: "4px",
              }}
            >
              <Typography
                variant="mobH3"
                sx={{ fontSize: "18px", lineHeight: "24px" }}
              >
                {collateralContract.availableCollateral.format(
                  TOKEN_FORMAT_DECIMALS,
                )}
              </Typography>
              <Typography
                variant="mobText4"
                sx={{
                  marginTop: "1px",
                }}
              >
                {collateralContract.collateralAsset.symbol}
              </Typography>
            </Box>

            <Typography variant="mobText4" color={COLORS.santasGrey}>
              {collateralValue !== undefined
                ? `$${collateralValue.toFixed(2)}`
                : "0"}
            </Typography>
          </Box>
        </Box>
      </>
    )

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
