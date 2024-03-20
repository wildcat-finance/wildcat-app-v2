import { Box, Button, Switch, Typography } from "@mui/material"
import Logo from "../../assets/icons/logo_white.svg"

export const Header = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 16px 16px 8px",
    }}
  >
    <Logo />
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        columnGap: "12px",

        color: "#FFFFFF",
      }}
    >
      <Typography variant="text2Highlighted">Borrowers</Typography>
      <Switch />
      <Typography variant="text2Highlighted">Lenders</Typography>
    </Box>
    <Button
      size="medium"
      sx={{
        width: "156px",
        color: "#FFFFFF",
        backgroundColor: "#FFFFFF1A",
        border: "none",
        "&:hover": {
          background: "#FFFFFF26",
          boxShadow: "none",
        },
      }}
    >
      Connect a wallet
    </Button>
  </Box>
)
