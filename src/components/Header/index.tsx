import { Box, Button, Switch, Typography } from "@mui/material"
import {
  ConnectButton,
  ContentContainer,
  NavContainer,
} from "@/components/Header/style"
import Logo from "../../assets/icons/logo_white.svg"

export const Header = () => (
  <Box sx={ContentContainer}>
    <Logo />
    <Box sx={NavContainer}>
      <Typography variant="text2Highlighted">Borrowers</Typography>
      <Switch />
      <Typography variant="text2Highlighted">Lenders</Typography>
    </Box>
    <Button size="medium" sx={ConnectButton}>
      Connect a wallet
    </Button>
  </Box>
)
