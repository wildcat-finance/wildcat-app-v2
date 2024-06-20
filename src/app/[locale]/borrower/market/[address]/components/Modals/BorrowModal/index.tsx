import { useState } from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import { COLORS } from "@/theme/colors"

export type BorrowModalProps = {
  disableOpenButton?: boolean
  available: string
  remaining: string
}

export const BorrowModal = ({
  disableOpenButton,
  available,
  remaining,
}: BorrowModalProps) => {
  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <Button
        onClick={handleClickOpen}
        variant="contained"
        size="large"
        sx={{ width: "152px" }}
        disabled={disableOpenButton}
      >
        Borrow
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        sx={{
          "& .MuiDialog-paper": {
            height: "404px",
            width: "440px",
            borderRadius: "20px",
            margin: 0,
            padding: "24px 0",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",

            padding: "0 24px 16px",
            marginBottom: "28px",
            borderBottom: `1px solid ${COLORS.athensGrey}`,
          }}
        >
          <IconButton disableRipple onClick={handleClose}>
            <SvgIcon
              fontSize="medium"
              sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
            >
              <Cross />
            </SvgIcon>
          </IconButton>

          <Typography variant="title3" textAlign="center">
            Borrow
          </Typography>

          <Box width="16px" height="16px" />
        </Box>

        <Box sx={{ padding: "0 24px" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
              Available to Borrow
            </Typography>
            <Typography variant="text3">{available}</Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
              Interest Remaining
            </Typography>
            <Typography variant="text3">{remaining}</Typography>
          </Box>

          <TextField fullWidth placeholder={`Up to ${available}`} />
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: "8px",
            padding: "0 24px",
            marginTop: "auto",
          }}
        >
          <Button variant="contained" size="large" sx={{ width: "100%" }}>
            Approve
          </Button>
          <Button variant="contained" size="large" sx={{ width: "100%" }}>
            Borrow
          </Button>
        </Box>
      </Dialog>
    </>
  )
}
