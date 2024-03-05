import { Typography, Box, Button } from "@mui/material"
import {
  ConnectButton,
  ContentContainer,
  LoginDescription,
  LoginTitle,
} from "@/app/style"

export default function LoginPage() {
  return (
    <Box sx={ContentContainer}>
      <Typography variant="title1Highlighted" sx={LoginTitle}>
        Hello, Stranger! Welcome to Wildcat.
      </Typography>
      <Typography variant="title3" sx={LoginDescription}>
        Please connect your wallet to access the app.
      </Typography>
      <Button variant="contained" size="large" sx={ConnectButton}>
        Connect a wallet
      </Button>
    </Box>
  )
}
