import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import type { WrapperTransferAccessStatus } from "@/hooks/wrapper/useWrapperTransferAccess"
import { COLORS } from "@/theme/colors"

export type WrapperTransferAccessNoticeProps = {
  status: WrapperTransferAccessStatus
  wrapperAddress: string
  managePolicyHref?: string
  inset?: boolean
  isRetrying?: boolean
  onRetry?: () => void
}

export const WrapperTransferAccessNotice = ({
  status,
  wrapperAddress,
  managePolicyHref,
  inset,
  isRetrying,
  onRetry,
}: WrapperTransferAccessNoticeProps) => {
  const { t } = useTranslation()

  if (status === "allowed" || status === "not-applicable") return null

  const isDenied = status === "denied"
  const isError = status === "error"
  let backgroundColor = COLORS.glitter
  if (isDenied) backgroundColor = COLORS.oasis
  if (isError) backgroundColor = COLORS.remy
  let message: string
  if (isDenied) {
    message = t(
      "marketDetails.lender.wrapDebtToken.wrapperAccess.denied.message",
    )
  } else if (isError) {
    message = t(
      "marketDetails.lender.wrapDebtToken.wrapperAccess.error.message",
    )
  } else {
    message = t(
      "marketDetails.lender.wrapDebtToken.wrapperAccess.checking.message",
    )
  }

  return (
    <Box
      role={isDenied || isError ? "alert" : "status"}
      aria-live="polite"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "stretch", sm: "center" },
        gap: "12px",
        padding: "12px",
        marginBottom: "20px",
        marginX: inset ? "16px" : 0,
        borderRadius: "8px",
        backgroundColor,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="text2"
          color={isError ? COLORS.dullRed : COLORS.blackRock}
        >
          {message}
        </Typography>

        {isDenied && (
          <Typography
            variant="text4"
            color={COLORS.blackRock}
            sx={{ marginTop: "4px", overflowWrap: "anywhere" }}
          >
            {t(
              "marketDetails.lender.wrapDebtToken.wrapperAccess.denied.address",
              { address: wrapperAddress },
            )}
          </Typography>
        )}
      </Box>

      {isDenied && managePolicyHref && (
        <Button
          component={Link}
          href={managePolicyHref}
          variant="outlined"
          color="secondary"
          size="small"
          sx={{ flexShrink: 0 }}
        >
          {t(
            "marketDetails.lender.wrapDebtToken.wrapperAccess.denied.managePolicy",
          )}
        </Button>
      )}

      {isError && onRetry && (
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          disabled={isRetrying}
          onClick={onRetry}
          sx={{ flexShrink: 0 }}
        >
          {t("common.buttons.retry")}
        </Button>
      )}
    </Box>
  )
}
