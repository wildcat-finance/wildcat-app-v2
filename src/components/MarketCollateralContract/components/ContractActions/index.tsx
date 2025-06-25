import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { MarketAccount, MarketCollateralV1 } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { DepositModalContract } from "@/components/MarketCollateralContract/components/DepositModal"
import { LiquidateCollateralModal } from "@/components/MarketCollateralContract/components/LiquidateModal"
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
  handleBackClick: () => void
}

export const ContractActions = ({
  marketAccount,
  collateralContract: inputCollateralContract,
  handleBackClick,
}: ContractActionsType) => {
  const { market } = marketAccount
  const { t } = useTranslation()
  const { collateral: collateralContract, depositor } =
    useUpdatedCollateralContract(inputCollateralContract)
  const showDeposit = !market.isClosed
  const showLiquidate =
    market.isIncurringPenalties && collateralContract.availableCollateral.gt(0)
  const showReclaim =
    market.isClosed && depositor && depositor.sharesValue.gt(0)
  const { isTestnet } = useCurrentNetwork()
  const { data: bebopTokens } = useGetBebopTokens()
  const collateralTokenFromBebop = bebopTokens?.find(
    (token) =>
      token.address === collateralContract.collateralAsset.address ||
      (isTestnet &&
        token.symbol.toLowerCase() ===
          collateralContract.collateralAsset.symbol.toLowerCase()),
  )

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
      <Button
        size="large"
        variant="text"
        sx={{ justifyContent: "flex-start", borderRadius: "12px" }}
        onClick={handleBackClick}
      >
        <SvgIcon
          fontSize="medium"
          sx={{
            marginRight: "4px",
            "& path": { fill: `${COLORS.bunker}` },
          }}
        >
          <BackArrow />
        </SvgIcon>
        {t("collateral.actions.back")}
      </Button>
      <Typography variant="title3" marginBottom="4px">
        {t("collateral.actions.title")}
      </Typography>
      <Typography variant="text3" color={COLORS.santasGrey} marginBottom="24px">
        {t("collateral.actions.description")}{" "}
        <Link
          href="https://docs.wildcat.finance/"
          style={{ color: COLORS.santasGrey }}
          target="_blank"
        >
          {t("collateral.actions.learnMore")}
        </Link>
      </Typography>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
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
            padding: "4px 16px",
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
            padding: "4px 16px",
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
        asset={market.underlyingToken.symbol}
        convertedAmount={`0 ${collateralContract.collateralAsset.symbol}`}
        marginBottom="10px"
      >
        {showLiquidate && (
          <LiquidateCollateralModal collateral={collateralContract} />
        )}
      </CollateralActionsItem>

      <CollateralActionsItem
        amount={collateralContract.availableCollateral.format(
          TOKEN_FORMAT_DECIMALS,
        )}
        label={t("collateral.actions.availableCollateral")}
        asset={collateralContract.collateralAsset.symbol}
        convertedAmount={
          collateralValue !== undefined ? `$${collateralValue.toFixed(2)}` : "0"
        }
        marginBottom="10px"
      >
        {showDeposit && (
          <DepositModalContract
            marketAccount={marketAccount}
            collateralContract={collateralContract}
          />
        )}
      </CollateralActionsItem>
      {depositor && depositor.sharesValue.gt(0) && (
        <CollateralActionsItem
          amount={`${collateralContract.collateralAsset
            .getAmount(depositor.shares)
            .format()} shares of ${collateralContract.collateralAsset
            .getAmount(collateralContract.totalShares)
            .format()} total`}
          label={t("collateral.actions.yourShares")}
          asset={undefined}
          convertedAmount={depositor.sharesValue.format(
            depositor.sharesValue.token.decimals,
            true,
          )}
        >
          {showReclaim && (
            <ReclaimModalContract
              market={market}
              collateralContract={collateralContract}
              depositor={depositor}
            />
          )}
        </CollateralActionsItem>
      )}

      <Typography variant="text3" color={COLORS.santasGrey} marginBottom="24px">
        {t("collateral.actions.disclaimer")}
      </Typography>
    </Box>
  )
}
