import { Box, Switch, Typography } from "@mui/material"

import { ContentContainer, NavContainer } from "@/components/Header/style"

import { HeaderButton } from "../HeaderButton"
import Logo from "../../assets/icons/logo_white.svg"

export const Header = () => (
  <Box sx={ContentContainer}>
    <Logo />
    <Box sx={NavContainer}>
      <Typography variant="text2Highlighted">Borrowers</Typography>
      <Switch />
      <Typography variant="text2Highlighted">Lenders</Typography>
    </Box>
    <HeaderButton />
  </Box>
)
