import React, { useState } from "react"

import { Box, Dialog, IconButton, SvgIcon } from "@mui/material"

import Filter from "@/assets/icons/filter_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { COLORS } from "@/theme/colors"

export const MobileSearchButton = () => {
  const [open, setOpen] = useState<boolean>(false)

  const handleToggleOpen = () => setOpen((prev) => !prev)

  return (
    <>
      <IconButton
        onClick={handleToggleOpen}
        sx={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          backgroundColor: COLORS.blackHaze,
          "&:hover": {
            backgroundColor: COLORS.hintOfRed,
          },
        }}
      >
        <SvgIcon
          sx={{
            fontSize: "14px",
            "& path": {
              fill: "#8A8C9F",
            },
          }}
        >
          <Search />
        </SvgIcon>
      </IconButton>

      <Dialog
        open={open}
        onClose={handleToggleOpen}
        sx={{
          height: "calc(100dvh - 64px)",
          marginTop: "auto",
          zIndex: 4,

          "& .MuiPaper-root.MuiDialog-paper": {
            maxHeight: "100%",
            height: "100%",
            border: "none",
            margin: "0 4px 4px",
            width: "100%",
            padding: "8px",
          },
          "& .MuiBackdrop-root": {
            marginTop: "auto",
            height: "100dvh",
            backgroundColor: "transparent",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 12px",
            marginBottom: "8px",
          }}
        >
          <Box />
        </Box>
      </Dialog>
    </>
  )
}
