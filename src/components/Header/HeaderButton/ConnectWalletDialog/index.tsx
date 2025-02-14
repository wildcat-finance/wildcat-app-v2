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

import CoinBase from "@/assets/icons/coinbase_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import MetaMask from "@/assets/icons/meta_icon.svg"
import RabbyIcon from "@/assets/icons/rabby_icon.svg"
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
const METAMASK_CONNECTOR_NAME = "MetaMask"
const RABBY_CONNECTOR_NAME = "Rabby"

const walletIcons = {
  [METAMASK_CONNECTOR_NAME]: <MetaMask />,
  WalletConnect: <WalletConnect />,
  "Coinbase Wallet": <CoinBase />,
  [SAFE_CONNECTOR_NAME]: <Safe />,
  [RABBY_CONNECTOR_NAME]: <RabbyIcon />,
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
      let filteredConnectors = connectors
        .filter(
          (connector) =>
            !(
              connector.name === SAFE_CONNECTOR_NAME ||
              connector.name === "Injected"
            ),
        )
        .reverse()

      // Detect if Rabby is installed
      const isRabbyInstalled =
        typeof window !== "undefined" && window.ethereum?.isRabby

      if (isRabbyInstalled) {
        filteredConnectors = filteredConnectors.map((connector) =>
          connector.name === METAMASK_CONNECTOR_NAME
            ? { ...connector, name: RABBY_CONNECTOR_NAME }
            : connector,
        )
      }

      // Safe Connector Logic
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
