import { Box, Button, Dialog, SvgIcon, Typography } from "@mui/material"
import { useMutation } from "@tanstack/react-query"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount, useSwitchChain } from "wagmi"

import Cross from "@/assets/icons/cross_icon.svg"
import {
  ContentContainer,
  DialogContainer,
} from "@/components/Header/HeaderNetworkButton/NetworkSelectDialog/style"
import { NetworkIcon } from "@/components/NetworkIcon"
import { NETWORKS } from "@/config/network"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { config, getAddEthereumChainParameter } from "@/lib/config"
import { useAppDispatch } from "@/store/hooks"
import { setSelectedNetwork } from "@/store/slices/selectedNetworkSlice/selectedNetworkSlice"
import { COLORS } from "@/theme/colors"

import { NetworkSelectDialogProps } from "./type"

const PrimaryNetworks = Object.values(NETWORKS)
// Sort networks: non-testnet first
const sortedNetworks = PrimaryNetworks.sort((a, b) => {
  if (a.isTestnet && !b.isTestnet) return 1
  if (!a.isTestnet && b.isTestnet) return -1
  return 0
})

export const NetworkSelectDialog = ({
  open,
  handleClose,
}: NetworkSelectDialogProps) => {
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
      <Box sx={ContentContainer} className="test">
        {PrimaryNetworks.map((network) => (
          <Button
            variant="text"
            fullWidth
            sx={{
              padding: "10px 12px 10px 8px !important",
              gap: "8px",
              alignItems: "center",
            }}
            onClick={() => handleSelectNetwork(network.chainId)}
            disabled={network.chainId === selectedNetwork.chainId}
          >
            <NetworkIcon chainId={network.chainId} />

            <Typography
              variant="text2"
              sx={{ width: "100%", fontWeight: 600, textAlign: "left" }}
            >
              {network.name} {network.isTestnet && !network.name.toLowerCase().includes("testnet") && "(Testnet)"}
            </Typography>
          </Button>
        ))}
      </Box>
    </Dialog>
  )
}
