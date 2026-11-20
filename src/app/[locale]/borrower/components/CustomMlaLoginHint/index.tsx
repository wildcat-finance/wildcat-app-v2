"use client"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useLogin } from "@/hooks/useApiAuth"
import { COLORS } from "@/theme/colors"

/// Custom MLAs are listed only for a logged-in borrower, so a borrower who is
/// not logged in on this network is offered a login next to the MLA list.
export const CustomMlaLoginHint = () => {
  const { t } = useTranslation()
  const { address } = useAccount()
  const { mutate: login, isPending } = useLogin()
  if (!address) return null
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Typography variant="text4" color={COLORS.santasGrey}>
        {t("mla.loginForCustom")}
      </Typography>
      <Button
        variant="text"
        size="small"
        disabled={isPending}
        onClick={() => login(address)}
      >
        {t("mla.login")}
      </Button>
    </Box>
  )
}
