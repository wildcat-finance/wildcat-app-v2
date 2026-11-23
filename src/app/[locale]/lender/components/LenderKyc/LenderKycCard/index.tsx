"use client"

import { Box, SxProps, Theme } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { MobileLenderBanner } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileLenderBanner"
import { LeadBanner } from "@/components/LeadBanner"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useWagmiHydrated } from "@/hooks/useWagmiHydrated"
import { useAppDispatch } from "@/store/hooks"
import { setLenderKycDialogOpen } from "@/store/slices/lenderKycDialogSlice/lenderKycDialogSlice"

export const LenderKycCard = ({ sx }: { sx?: SxProps<Theme> }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const isMobile = useMobileResolution()
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const isWalletHydrated = useWagmiHydrated()

  const isWalletReady = isWalletHydrated && !isConnecting && !isReconnecting
  const isWalletAvailable = isWalletReady && isConnected && !!address

  if (!isWalletAvailable) return null

  const openDialog = () => dispatch(setLenderKycDialogOpen(true))

  return (
    <Box sx={sx}>
      {isMobile ? (
        <MobileLenderBanner
          title={t("lenderKyc.card.title")}
          subtitle={t("lenderKyc.card.description")}
          buttonText={t("lenderKyc.card.button")}
          onButtonClick={openDialog}
          tone="neutral"
        />
      ) : (
        <LeadBanner
          title={t("lenderKyc.card.title")}
          subtitle={t("lenderKyc.card.description")}
          buttonText={t("lenderKyc.card.button")}
          buttonOnClick={openDialog}
          compact
          tone="neutral"
        />
      )}
    </Box>
  )
}
