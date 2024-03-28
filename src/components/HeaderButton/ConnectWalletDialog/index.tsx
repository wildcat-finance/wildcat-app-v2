import { Connector, CreateConnectorFn, useConnect } from "wagmi"
import { Box, Button, Dialog, IconButton, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { COLORS } from "@/theme/colors"

import Cross from "@/assets/icons/cross_icon.svg"
import MetaMask from "@/assets/icons/meta_icon.svg"
import WalletConnect from "@/assets/icons/walletConnect_icon.svg"
import CoinBase from "@/assets/icons/coinbase_icon.svg"

const walletIcons = {
  MetaMask: <MetaMask />,
  WalletConnect: <WalletConnect />,
  "Coinbase Wallet": <CoinBase />,
}

export type ConnectWalletDialogProps = {
  open: boolean
  handleClose: () => void
}

export const ConnectWalletDialog = ({
  open,
  handleClose,
}: ConnectWalletDialogProps) => {
  const { connectors, connect } = useConnect()

  const handleClickConnect = (connector: CreateConnectorFn | Connector) => {
    connect({ connector })
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      sx={{
        "& .MuiDialog-paper": {
          width: "320px",
          borderRadius: "12px",
          borderColor: "#0000001A",
          margin: 0,
          padding: "24px 20px 20px",

          display: "flex",
          flexDirection: "column",
          rowGap: "32px",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box width="16px" height="16px" />
        <Typography variant="text1" sx={{ textAlign: "center" }}>
          Connect Wallet
        </Typography>
        <IconButton disableRipple sx={{ padding: 0 }} onClick={handleClose}>
          <SvgIcon
            fontSize="medium"
            sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
          >
            <Cross />
          </SvgIcon>
        </IconButton>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", rowGap: "4px" }}>
        {connectors
          .filter(
            (connector) =>
              !(connector.name === "Safe" || connector.name === "Injected"),
          )
          .reverse()
          .map((connector) => (
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={() => handleClickConnect(connector)}
              sx={{
                justifyContent: "flex-start",
                columnGap: "12px",
                borderRadius: "0px 0px 0px 0px",
                "&:first-child": {
                  borderRadius: "8px 8px 0px 0px",
                },
                "&:last-child": {
                  borderRadius: "0px 0px 8px 8px",
                },
              }}
            >
              <SvgIcon fontSize="medium">
                {walletIcons[connector.name as keyof typeof walletIcons]}
              </SvgIcon>
              <Typography variant="text2">{connector.name}</Typography>
            </Button>
          ))}
      </Box>
      <Typography
        variant="text4"
        sx={{
          maxWidth: "280px",
          textAlign: "center",
          color: COLORS.greySuit,
        }}
      >
        By connecting a wallet, you agree to Wildcat Terms of Service ans
        consent to its Privacy Policy
      </Typography>
    </Dialog>
  )
}
