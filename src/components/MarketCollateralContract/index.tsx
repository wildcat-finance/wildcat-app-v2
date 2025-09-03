import { useEffect, useState } from "react"
import * as React from "react"

import {
  Box,
  Link as MuiLink,
  Skeleton,
  SvgIcon,
  Typography,
} from "@mui/material"
import { GridColDef, GridValidRowModel } from "@mui/x-data-grid"
import { MarketAccount, MarketCollateralV1 } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import Coins from "@/assets/icons/coins_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { CollateralHeader } from "@/components/MarketCollateralContract/components/CollateralHeader"
import { ContractActions } from "@/components/MarketCollateralContract/components/ContractActions"
import { CreateContractForm } from "@/components/MarketCollateralContract/components/CreateContractForm"
import { MobileCollateralSelect } from "@/components/MarketCollateralContract/components/mobile/MobileCollateralSelect"
import { TooltipButton } from "@/components/TooltipButton"
import { EtherscanBaseUrl } from "@/config/network"
import { useGetCollateralContracts } from "@/hooks/useGetCollateralContracts"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { TOKEN_FORMAT_DECIMALS, trimAddress } from "@/utils/formatters"

import { CollateralContractsTable } from "./components/CollateralContractsTable"

export type TypeSafeColDef<
  R extends GridValidRowModel,
  F extends string | void = void,
> = GridColDef<R> & {
  field: keyof R | "action" | F
}

export type MarketCollateralContractProps = {
  marketAccount: MarketAccount
  hideActions?: boolean
}

export const MarketCollateralContract = ({
  marketAccount,
  hideActions,
}: MarketCollateralContractProps) => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()

  const { market } = marketAccount
  const { data: collateralContracts, isLoading } =
    useGetCollateralContracts(market)

  const [selectedCollateralContract, setSelectedCollateralContract] =
    useState<MarketCollateralV1>()

  const contractName = selectedCollateralContract?.collateralAsset.name

  useEffect(() => {
    if (
      isMobile &&
      collateralContracts &&
      selectedCollateralContract === undefined
    ) {
      setSelectedCollateralContract(collateralContracts[0])
    }
  }, [collateralContracts, isLoading, isMobile])

  if (
    isMobile &&
    selectedCollateralContract &&
    collateralContracts?.length !== 0
  )
    return (
      <Box
        id="collateral"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "28px",
          backgroundColor: COLORS.white,
          borderRadius: "14px",
          padding: "12px 16px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="mobH3" sx={{ margin: "12px 0 8px" }}>
            {t("collateral.actions.title")}
          </Typography>
          <Typography variant="mobText3" color={COLORS.santasGrey}>
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

        {collateralContracts && collateralContracts?.length > 1 && (
          <MobileCollateralSelect
            collateralContracts={collateralContracts}
            selectedContract={selectedCollateralContract}
            setSelectedContract={setSelectedCollateralContract}
          />
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <Typography variant="mobText3">
            {t("collateral.actions.address")}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 8px 6px 12px",
              borderRadius: "8px",
              bgcolor: COLORS.blackHaze,
            }}
          >
            <Typography variant="mobText2">
              {trimAddress(selectedCollateralContract.address)}
            </Typography>
            <LinkGroup
              type="withCopy"
              linkValue={`${EtherscanBaseUrl}/address/${selectedCollateralContract.address}`}
              copyValue={selectedCollateralContract.address}
            />
          </Box>
        </Box>

        <ContractActions
          marketAccount={marketAccount}
          collateralContract={selectedCollateralContract}
          hideActions={hideActions}
        />
      </Box>
    )

  if (isLoading && !isMobile)
    return (
      <Box
        display="flex"
        flexDirection="column"
        padding="32px 16px"
        rowGap="8px"
      >
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      </Box>
    )

  if (!isMobile)
    return (
      <Box sx={{ width: "100%" }}>
        {selectedCollateralContract && (
          <Box
            sx={{
              backgroundColor: COLORS.oasis,
              padding: "12px 16px",
              borderRadius: "12px",
              marginBottom: "24px",

              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <Coins />
            <Typography variant="text3" color={COLORS.butteredRum}>
              Collateral cannot be reclaimed until the underlying market is
              terminated.
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: collateralContracts?.length === 0 ? "column" : "row",
            justifyContent: "space-between",
            alignItems:
              collateralContracts?.length === 0 ? "flex-start" : "center",
          }}
        >
          <CollateralHeader
            contractName={contractName}
            contractsNumber={collateralContracts?.length}
            handleBackClick={() => setSelectedCollateralContract(undefined)}
            isBorrower={marketAccount.isBorrower}
          />

          {!selectedCollateralContract &&
            marketAccount.isBorrower &&
            !market.isClosed && (
              <CreateContractForm
                market={market}
                existingCollateralContracts={collateralContracts || []}
              />
            )}
        </Box>

        {!selectedCollateralContract && (
          <CollateralContractsTable
            collateralContracts={collateralContracts || []}
            setSelectedCollateralContract={setSelectedCollateralContract}
          />
        )}

        {selectedCollateralContract && (
          <ContractActions
            marketAccount={marketAccount}
            collateralContract={selectedCollateralContract}
            hideActions={hideActions}
          />
        )}
      </Box>
    )

  return null
}
