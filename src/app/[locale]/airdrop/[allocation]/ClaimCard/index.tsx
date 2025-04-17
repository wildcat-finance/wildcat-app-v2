import {
  Card,
  Typography,
  Button,
  IconButton,
  Box,
  Stack,
  Divider,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import { trimAddress } from "@/utils/formatters"

export const ClaimCard = () => {
  const { t } = useTranslation()
  const contractAddress = "0x0000000000000000000000000000000000000000"
  const totalAllocation = 1000
  const availableToClaim = 1000
  const nextClaimDate = "18-03-25 13:24:56"
  const claimed = 1000

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress)
  }

  return (
    <Box sx={{ p: 3, borderRadius: 2 }}>
      <Stack spacing={3}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              {t("totalAllocation")}
            </Typography>
            <Typography variant="h4" component="div" sx={{ mt: 1 }}>
              {totalAllocation.toLocaleString()} WETH
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              {t("contractAddress")}
            </Typography>
            <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {trimAddress(contractAddress)}
              </Typography>
              <IconButton
                size="small"
                onClick={handleCopy}
                aria-label={t("copyAddress")}
              >
                ?
              </IconButton>
            </Box>
          </Box>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            {t("availableToClaim")}
          </Typography>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 1 }}
          >
            <Typography variant="h5">
              {availableToClaim.toLocaleString()} WETH
            </Typography>
            <Button variant="contained" size="large">
              {t("claim")}
            </Button>
          </Box>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {t("nextClaimOn")}: {nextClaimDate}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("claimed")}: {claimed} WETH
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}
