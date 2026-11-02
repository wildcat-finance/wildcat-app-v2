import * as React from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  SvgIcon,
  Typography,
} from "@mui/material"
import { Trans, useTranslation } from "react-i18next"

import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import CircledCrossRed from "@/assets/icons/circledCrossRed_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { Loader } from "@/components/Loader"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"

import {
  TxStatusPanelActions,
  TxStatusPanelBody,
  TxStatusPanelCloseIcon,
  TxStatusPanelContainer,
  TxStatusPanelHeader,
  TxStatusPanelSubtitle,
  TxStatusPanelText,
  TxStatusSheetDialog,
} from "./style"

export type TxStatus = "loading" | "success" | "error"

export type TxStatusPanelProps = {
  status: TxStatus
  title?: string
  subtitle?: string
  txHash?: string
  onClose?: () => void
  onAction?: () => void
  actionLabel?: string
}

const DEFAULT_TITLE_KEY: Record<TxStatus, string> = {
  loading: "borrowerMarketDetails.modals.loading.title",
  success: "borrowerMarketDetails.modals.success.title",
  error: "borrowerMarketDetails.modals.error.wait",
}

const DEFAULT_SUBTITLE_KEY: Record<TxStatus, string> = {
  loading: "borrowerMarketDetails.modals.loading.subtitle",
  success: "borrowerMarketDetails.modals.success.subtitle",
  error: "borrowerMarketDetails.modals.error.subtitle",
}

const StatusIcon = ({ status }: { status: TxStatus }) => {
  if (status === "loading") return <Loader />

  return (
    <SvgIcon fontSize="colossal">
      {status === "success" ? <CircledCheckBlue /> : <CircledCrossRed />}
    </SvgIcon>
  )
}

export const TxStatusPanel = ({
  status,
  title,
  subtitle,
  txHash,
  onClose,
  onAction,
  actionLabel,
}: TxStatusPanelProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { getTxUrl } = useBlockExplorer()

  const hasLink = txHash !== undefined && txHash !== ""

  return (
    <Box
      sx={TxStatusPanelContainer(isMobile)}
      role={status === "error" ? "alert" : undefined}
    >
      <Box sx={TxStatusPanelHeader}>
        {onClose && (
          <IconButton
            disableRipple
            onClick={onClose}
            aria-label={t("txModal.close")}
          >
            <SvgIcon fontSize="big" sx={TxStatusPanelCloseIcon}>
              <Cross />
            </SvgIcon>
          </IconButton>
        )}
      </Box>

      <Box sx={TxStatusPanelBody}>
        <StatusIcon status={status} />

        <Box sx={TxStatusPanelText}>
          <Typography variant="text1">
            {title ?? <Trans i18nKey={DEFAULT_TITLE_KEY[status]} />}
          </Typography>
          <Typography variant="text3" sx={TxStatusPanelSubtitle}>
            {subtitle ?? <Trans i18nKey={DEFAULT_SUBTITLE_KEY[status]} />}
          </Typography>
        </Box>
      </Box>

      <Box sx={TxStatusPanelActions(status === "loading")}>
        {hasLink && (
          <LinkGroup
            type="etherscan"
            linkValue={getTxUrl(txHash)}
            groupSX={{ padding: "8px", justifyContent: "center" }}
          />
        )}

        {onAction && (
          <Button variant="contained" size="large" fullWidth onClick={onAction}>
            {actionLabel ?? (
              <Trans i18nKey="borrowerMarketDetails.modals.error.tryAgain" />
            )}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export const TxStatusSheet = ({
  open,
  children,
}: {
  open: boolean
  children: React.ReactNode
}) => (
  <Dialog open={open} sx={TxStatusSheetDialog}>
    {children}
  </Dialog>
)
