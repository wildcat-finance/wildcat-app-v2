import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  SvgIcon,
} from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount, useSwitchChain } from "wagmi"

import Cross from "@/assets/icons/cross_icon.svg"
import { NETWORKS, showTestnets } from "@/config/network"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useAppDispatch } from "@/store/hooks"
import { setSelectedNetwork } from "@/store/slices/selectedNetworkSlice/selectedNetworkSlice"

import {
  Buttons,
  ButtonsContainer,
  CloseButtonIcon,
  DialogContainer,
  TitleContainer,
} from "./style"
import { MobileSelectNetworkProps } from "./type"
import { NetworkIcon } from "../NetworkIcon"

const PrimaryNetworks = Object.values(NETWORKS)
// Sort networks: non-testnet first
const sortedNetworks = PrimaryNetworks.filter((network) => {
  if (network.isTestnet && !showTestnets) return false
  return true
}).sort((a, b) => {
  if (a.isTestnet && !b.isTestnet) return 1
  if (!a.isTestnet && b.isTestnet) return -1
  return 0
})

export const MobileSelectNetwork = ({
  open,
  handleClose,
}: MobileSelectNetworkProps) => {
  const dispatch = useAppDispatch()
  const { switchChain } = useSwitchChain()
  const { address } = useAccount()

  const handleSelectNetwork = (chainId: SupportedChainId) => {
    if (address) {
      switchChain({ chainId })
    }
    dispatch(setSelectedNetwork(chainId))
  }

  const selectedNetwork = useSelectedNetwork()

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <Box sx={TitleContainer}>
        <Box width="20px" height="20px" />
        <Typography variant="text1" textAlign="center">
          Select Network
        </Typography>
        <IconButton disableRipple onClick={handleClose}>
          <SvgIcon sx={CloseButtonIcon}>
            <Cross />
          </SvgIcon>
        </IconButton>
      </Box>
      <Box sx={ButtonsContainer}>
        {/* {activeConnectors.map((connector) => (
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
        ))} */}
        {sortedNetworks.map((network) => (
          <Button
            key={network.chainId}
            variant="contained"
            color="secondary"
            fullWidth
            sx={Buttons}
            onClick={() => handleSelectNetwork(network.chainId)}
            disabled={network.chainId === selectedNetwork.chainId}
          >
            <NetworkIcon chainId={network.chainId} />

            <Typography
              variant="text2"
              sx={{ width: "100%", fontWeight: 600, textAlign: "left" }}
            >
              {network.name}{" "}
              {network.isTestnet &&
                !network.name.toLowerCase().includes("testnet") &&
                "(Testnet)"}
            </Typography>
          </Button>
        ))}
      </Box>
    </Dialog>
  )
}
