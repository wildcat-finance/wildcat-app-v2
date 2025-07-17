import * as React from "react"
import { useState } from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  SvgIcon,
  Typography,
} from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useAddToken } from "@/app/[locale]/lender/market/[address]/hooks/useAddToken"
import Cross from "@/assets/icons/cross_icon.svg"
import { COLORS } from "@/theme/colors"

export const MobileMoreButton = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const { t } = useTranslation()
  const { market } = marketAccount

  const [open, setOpen] = useState(false)
  const toggleOpen = () => setOpen((prev) => !prev)

  const { canAddToken, handleAddToken, isAddingToken } = useAddToken(
    market?.marketToken,
  )

  return (
    <>
      <Button
        onClick={toggleOpen}
        variant="contained"
        color="secondary"
        sx={{
          width: 28,
          minWidth: 28,
          height: 28,
          p: 0,
          borderRadius: "50%",
        }}
      >
        <Typography variant="text4" sx={{ mb: "6px" }}>
          ...
        </Typography>
      </Button>

      <Dialog
        open={open}
        onClose={toggleOpen}
        sx={{
          backdropFilter: "blur(10px)",
          "& .MuiDialog-paper": {
            width: "100%",
            maxWidth: "100%",
            borderRadius: "14px",
            p: "8px",
            m: "auto 4px 4px",
            border: 0,
            height: "fit-content",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: "16px",
            p: "6px 0",
          }}
        >
          <Box sx={{ width: 20 }} />
          <Typography variant="mobText2">Wallet Actions</Typography>
          <IconButton onClick={toggleOpen} sx={{ width: 20, height: 20 }}>
            <SvgIcon
              sx={{ fontSize: 20, "& path": { fill: COLORS.santasGrey } }}
            >
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>

        {canAddToken && (
          <Button
            variant="contained"
            color="secondary"
            size="medium"
            onClick={() => handleAddToken()}
            disabled={isAddingToken}
          >
            <Typography variant="mobText3SemiBold">
              {t("lenderMarketDetails.buttons.addToken")}
            </Typography>
          </Button>
        )}
      </Dialog>
    </>
  )
}
