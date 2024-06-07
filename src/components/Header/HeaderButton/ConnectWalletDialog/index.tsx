import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  SvgIcon,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import { Connector, CreateConnectorFn, useConnect } from "wagmi"

import CoinBase from "@/assets/icons/coinbase_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import MetaMask from "@/assets/icons/meta_icon.svg"
import WalletConnect from "@/assets/icons/walletConnect_icon.svg"
import {
  Buttons,
  ButtonsContainer,
  CloseButtonIcon,
  DialogContainer,
  Terms,
  TitleContainer,
} from "@/components/Header/HeaderButton/ConnectWalletDialog/style"
import { ConnectWalletDialogProps } from "@/components/Header/HeaderButton/ConnectWalletDialog/type"

const walletIcons = {
  MetaMask: <MetaMask />,
  WalletConnect: <WalletConnect />,
  "Coinbase Wallet": <CoinBase />,
}

export const ConnectWalletDialog = ({
  open,
  handleClose,
}: ConnectWalletDialogProps) => {
  const { connectors, connect } = useConnect()
  const { t } = useTranslation()

  const handleClickConnect = (connector: CreateConnectorFn | Connector) => {
    connect({ connector })
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <Box sx={TitleContainer}>
        <Box width="16px" height="16px" />
        <Typography variant="text1" textAlign="center">
          {t("header.modal.title")}
        </Typography>
        <IconButton disableRipple onClick={handleClose}>
          <SvgIcon fontSize="medium" sx={CloseButtonIcon}>
            <Cross />
          </SvgIcon>
        </IconButton>
      </Box>
      <Box sx={ButtonsContainer}>
        {connectors
          .filter(
            (connector) =>
              !(connector.name === "Safe" || connector.name === "Injected"),
          )
          .reverse()
          .map((connector) => (
            <Button
              key={connector.id}
              variant="contained"
              color="secondary"
              fullWidth
              onClick={() => handleClickConnect(connector)}
              sx={Buttons}
            >
              <SvgIcon fontSize="medium">
                {walletIcons[connector.name as keyof typeof walletIcons]}
              </SvgIcon>
              <Typography variant="text2">{connector.name}</Typography>
            </Button>
          ))}
      </Box>
      <Typography variant="text4" sx={Terms}>
        {t("header.modal.note")}
      </Typography>
    </Dialog>
  )
}
