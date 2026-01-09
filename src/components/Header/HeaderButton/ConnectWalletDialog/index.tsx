import { useEffect, useState } from "react"

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

import Cross from "@/assets/icons/cross_icon.svg"
import MetaMask from "@/assets/icons/meta_icon.svg"
import Safe from "@/assets/icons/safe.svg"
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

const SAFE_CONNECTOR_NAME = "Safe"

const walletIcons = {
  // Rainbow: <Rainbow />,
  // Keplr: <Keplr />,
  // "Rabby Wallet": <Rabby />,
  // Phantom: <Phantom />,
  MetaMask: <MetaMask />,
  WalletConnect: <WalletConnect />,
  // "Coinbase Wallet": <CoinBase />,
  [SAFE_CONNECTOR_NAME]: <Safe />,
}

export const ConnectWalletDialog = ({
  open,
  handleClose,
}: ConnectWalletDialogProps) => {
  const [activeConnectors, setActiveConnectors] = useState<Connector[]>([])
  const { connectors, connect } = useConnect()
  const { t } = useTranslation()

  useEffect(() => {
    async function setConnectors() {
      const filteredConnectors = connectors
        .filter(
          (connector) =>
            !(
              connector.name === SAFE_CONNECTOR_NAME ||
              connector.name === "Injected"
            ),
        )
        .reverse()

      const safeConnector = connectors.find(
        (connector) => connector.name === SAFE_CONNECTOR_NAME,
      )
      const safeIsAuthorised = await safeConnector?.isAuthorized()

      if (safeConnector && safeIsAuthorised) {
        setActiveConnectors([...filteredConnectors, safeConnector])
      } else {
        setActiveConnectors(filteredConnectors)
      }
    }

    setConnectors()
  }, [connectors])

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
        {activeConnectors.map((connector) => (
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
