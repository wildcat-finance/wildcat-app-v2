import { Dispatch, SetStateAction } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  SvgIcon,
} from "@mui/material"

import Menu from "@/assets/icons/burgerMenu_icon.svg"
import { COLORS } from "@/theme/colors"

export type MobileMenuProps = {
  open: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

const TextButtonStyles = {
  minWidth: "fit-content",
  "&:hover": {
    color: COLORS.bunker,
    background: "transparent",
    boxShadow: "none",
  },
}

export const MobileMenu = ({ open, setIsOpen }: MobileMenuProps) => {
  const handleToggleModal = () => {
    setIsOpen(!open)
  }

  return (
    <>
      <IconButton
        onClick={handleToggleModal}
        sx={{
          marginLeft: { xs: "12px", sm: "0" },
          display: { xs: "block", sm: "none" },
        }}
      >
        <SvgIcon sx={{ fontSize: "40px" }}>
          <Menu />
        </SvgIcon>
      </IconButton>

      <Dialog
        open={open}
        onClose={handleToggleModal}
        fullWidth
        sx={{
          marginTop: "auto",
          height: "calc(100vh - 73.5px)",

          "& .MuiPaper-root.MuiDialog-paper": {
            margin: "0 4px auto",
            width: "100%",
            padding: "8px",
          },
          "& .MuiBackdrop-root": {
            marginTop: "auto",
            height: "calc(100vh - 73.5px)",
            backgroundColor: "transparent",
            backdropFilter: "blur(20px)",
          },
        }}
      >
        <Box sx={{ padding: "0 6px" }}>
          <Button size="large" fullWidth sx={TextButtonStyles}>
            Help
          </Button>
          <Divider sx={{ width: "100%" }} />
          <Button size="large" fullWidth sx={TextButtonStyles}>
            Docs
          </Button>
          <Divider sx={{ width: "100%" }} />
          <Button size="large" fullWidth sx={TextButtonStyles}>
            App
          </Button>
        </Box>
      </Dialog>
    </>
  )
}
