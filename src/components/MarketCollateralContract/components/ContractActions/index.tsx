import {
  Box,
  Button,
  IconButton,
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
  hideDeposit?: boolean
}

export const ContractActions = ({
  marketAccount,
  collateralContract: inputCollateralContract,
  handleBackClick,
  hideDeposit,
}: ContractActionsType) => {
  const { market } = marketAccount
  const { t } = useTranslation()
  const { collateral: collateralContract, depositor } =
    useUpdatedCollateralContract(inputCollateralContract)
  const showDeposit = !market.isClosed && !hideDeposit
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          mb: "28px",
        }}
      >
        <Box sx={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <IconButton onClick={handleBackClick}>
            <SvgIcon
              sx={{ fontSize: "16px", "& path": { fill: COLORS.santasGrey } }}
            >
              <BackArrow />
            </SvgIcon>
          </IconButton>

          <Typography variant="title3">
            {t("collateral.actions.title")}
          </Typography>
        </Box>

        <Typography variant="text3" color={COLORS.santasGrey}>
          {t("collateral.actions.description")}{" "}
          <MuiLink
            component={Link}
            href="https://docs.wildcat.finance"
            variant="inherit"
            underline="always"
            color="inherit"
            target="_blank"
          >
            {t("collateral.actions.learnMore")}
          </MuiLink>
        </Typography>
      </Box>

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
    </Box>
  )
}
