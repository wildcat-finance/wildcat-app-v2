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

  const [open, setOpen] = useState<boolean>(false)

  const handleToggleOpen = () => setOpen((prev) => !prev)

  const { canAddToken, handleAddToken, isAddingToken } = useAddToken(
    market?.marketToken,
  )

  return (
    <>
      <Button
        onClick={handleToggleOpen}
        variant="contained"
        color="secondary"
        sx={{
          width: "25px",
          minWidth: "28px",
          height: "28px",
          padding: "0px",
          borderRadius: "50%",
        }}
      >
        <Typography variant="text4" sx={{ marginBottom: "6px" }}>
          ...
        </Typography>
      </Button>

      <Dialog
        open={open}
        onClose={handleToggleOpen}
        sx={{
          backdropFilter: "blur(10px)",
          "& .MuiDialog-paper": {
            height: "fit-content",
            width: "100%",
            maxWidth: "100%",
            border: "none",
            borderRadius: "14px",
            padding: "8px",
            margin: "auto 4px 4px",
          },
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            padding: "6px 0",
          }}
        >
          <Box sx={{ width: "20px" }} />

          <Typography variant="mobText2">Wallet Actions</Typography>

          <IconButton
            onClick={handleToggleOpen}
            sx={{ width: "20px", height: "20px" }}
          >
            <SvgIcon
              sx={{ fontSize: "20px", "& path": { fill: COLORS.santasGrey } }}
            >
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Button
            variant="contained"
            color="secondary"
            size="medium"
            onClick={() => handleAddToken()}
            disabled={isAddingToken && canAddToken}
          >
            <Typography variant="mobText3SemiBold">
              {t("lenderMarketDetails.buttons.addToken")}
            </Typography>
          </Button>
          {/* <Button variant="contained" color="secondary" size="medium"> */}
          {/*  <Typography variant="mobText3SemiBold"> */}
          {/*    Download Statement */}
          {/*  </Typography> */}
          {/* </Button> */}
        </Box>
      </Dialog>
    </>
  )
}
