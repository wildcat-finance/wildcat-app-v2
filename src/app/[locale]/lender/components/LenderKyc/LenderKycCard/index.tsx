"use client"

import { useState } from "react"

import { Box, SxProps, Theme } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { MobileLenderBanner } from "@/app/[locale]/lender/market/[address]/components/mobile/MobileLenderBanner"
import { LeadBanner } from "@/components/LeadBanner"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useWagmiHydrated } from "@/hooks/useWagmiHydrated"

import { LenderKycDialog } from "../LenderKycDialog"

export const LenderKycCard = ({ sx }: { sx?: SxProps<Theme> }) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const isWalletHydrated = useWagmiHydrated()
  const { chainId } = useSelectedNetwork()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDialogMounted, setIsDialogMounted] = useState(false)

  const isWalletReady = isWalletHydrated && !isConnecting && !isReconnecting

  if (!isWalletReady || !isConnected || !address) return null

  const openDialog = () => {
    setIsDialogMounted(true)
    setIsDialogOpen(true)
  }

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

      {isDialogMounted && (
        <LenderKycDialog
          open={isDialogOpen}
          address={address}
          chainId={chainId}
          onClose={() => setIsDialogOpen(false)}
          onExited={() => setIsDialogMounted(false)}
        />
      )}
    </Box>
  )
}
