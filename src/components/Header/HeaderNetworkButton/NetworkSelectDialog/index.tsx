import { Box, Button, Chip, Dialog, Typography } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount, useSwitchChain } from "wagmi"

import {
  ContentContainer,
  DialogContainer,
  MobileDialogContainer,
  NetworkButton,
  SectionHeader,
} from "@/components/Header/HeaderNetworkButton/NetworkSelectDialog/style"
import { NetworkIcon } from "@/components/NetworkIcon"
import { NETWORKS, showTestnets } from "@/config/network"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useAppDispatch } from "@/store/hooks"
import { setSelectedNetwork } from "@/store/slices/selectedNetworkSlice/selectedNetworkSlice"
import { COLORS } from "@/theme/colors"

import { NetworkSelectDialogProps } from "./type"

const PrimaryNetworks = Object.values(NETWORKS)
const mainnetNetworks = PrimaryNetworks.filter((network) => !network.isTestnet)
const testnetNetworks = PrimaryNetworks.filter((network) => {
  if (!network.isTestnet) return false
  if (!showTestnets) return false
  return true
})

export const NetworkSelectDialog = ({
  open,
  handleClose,
}: NetworkSelectDialogProps) => {
  const dispatch = useAppDispatch()
  const { switchChain } = useSwitchChain()
  const { address } = useAccount()
  const isMobile = useMobileResolution()

  const handleSelectNetwork = (chainId: SupportedChainId) => {
    if (address) {
      switchChain({ chainId })
    }
    dispatch(setSelectedNetwork(chainId))
  }

  const selectedNetwork = useSelectedNetwork()

  const renderNetworkButton = (
    network: (typeof NETWORKS)[keyof typeof NETWORKS],
  ) => {
    const isSelected = network.chainId === selectedNetwork.chainId

    return (
      <Button
        key={network.chainId}
        variant="text"
        fullWidth
        sx={{
          ...NetworkButton,
          backgroundColor: COLORS.whiteSmoke,
          border: isSelected
            ? `1px solid ${COLORS.cornflowerBlue}`
            : "1px solid transparent",
          opacity: "1 !important",

          "&:hover": {
            backgroundColor: COLORS.whiteLilac,
          },
        }}
        onClick={() => handleSelectNetwork(network.chainId)}
        disabled={isSelected}
      >
        <NetworkIcon chainId={network.chainId} width={20} height={20} />

        <Typography
          variant="text2"
          sx={{
            flex: 1,
            fontWeight: 500,
            textAlign: "left",
            color: COLORS.blackRock,
          }}
        >
          {network.name}
        </Typography>

        {network.isTestnet && (
          <Chip
            label="Testnet"
            variant="filled"
            sx={{
              backgroundColor: COLORS.hawkesBlue,
              color: COLORS.cornflowerBlue,
              height: "auto",
            }}
          />
        )}
      </Button>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      sx={isMobile ? MobileDialogContainer : DialogContainer}
    >
      <Box sx={ContentContainer}>
        <Typography
          variant={isMobile ? "mobText1" : "text1"}
          textAlign={isMobile ? "center" : "start"}
          sx={{ color: COLORS.blackRock }}
        >
          Choose Deployment Chain
        </Typography>

        {mainnetNetworks.length > 0 && (
          <>
            <Typography
              variant="text3"
              sx={SectionHeader}
              textAlign={isMobile ? "center" : "start"}
            >
              Mainnet
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                width: "100%",
              }}
            >
              {mainnetNetworks.map(renderNetworkButton)}
            </Box>
          </>
        )}

        {testnetNetworks.length > 0 && (
          <>
            <Typography
              variant="text3"
              sx={SectionHeader}
              textAlign={isMobile ? "center" : "start"}
            >
              Testnets
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                width: "100%",
              }}
            >
              {testnetNetworks.map(renderNetworkButton)}
            </Box>
          </>
        )}
      </Box>
    </Dialog>
  )
}
