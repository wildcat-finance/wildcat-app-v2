import { Box, Button, Dialog, SvgIcon, Typography } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount, useSwitchChain } from "wagmi"

import Cross from "@/assets/icons/cross_icon.svg"
import {
  ContentContainer,
  DialogContainer,
} from "@/components/Header/HeaderNetworkButton/NetworkSelectDialog/style"
import { NETWORKS } from "@/config/network"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useAppDispatch } from "@/store/hooks"
import { setSelectedNetwork } from "@/store/slices/selectedNetworkSlice/selectedNetworkSlice"
import { COLORS } from "@/theme/colors"

import { NetworkSelectDialogProps } from "./type"

const PrimaryNetworks = Object.values(NETWORKS)

export const NetworkSelectDialog = ({
  open,
  handleClose,
}: NetworkSelectDialogProps) => {
  const dispatch = useAppDispatch()
  const { switchChain } = useSwitchChain()
  const { address } = useAccount()

  const handleSelectNetwork = (chainId: SupportedChainId) => {
    dispatch(setSelectedNetwork(chainId))
    if (address) {
      switchChain({ chainId })
    }
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
            <SvgIcon
              sx={{
                "& path": {
                  fill: `${COLORS.greySuit}`,
                },
              }}
            >
              <Cross />
            </SvgIcon>

            <Typography
              variant="text2"
              sx={{ width: "100%", fontWeight: 600, textAlign: "left" }}
            >
              {network.name}
            </Typography>
          </Button>
        ))}
        {/* 
        <Box sx={ProfileContainer} marginTop={isWrongNetwork ? "24px" : "40px"}>
          {avatar ? (
            <Image src={avatar} alt="avatar" width={44} height={44} />
          ) : (
            <SvgIcon sx={{ fontSize: "44px" }}>
              <Avatar />
            </SvgIcon>
          )}

          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            rowGap="2px"
            marginTop="18px"
          >
            {address && (
              <Box sx={AddressContainer}>
                <Typography variant="text1">{trimAddress(address)}</Typography>

                <LinkGroup
                  groupSX={{ columnGap: "8px" }}
                  copyValue={address?.toString()}
                  linkValue={`${EtherscanBaseUrl}/address/${address}`}
                />
              </Box>
            )}

            {(alias || name) && (
              <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
                {alias || name}
              </Typography>
            )}
            {connector?.name && (
              <Typography
                variant="text3"
                sx={{ color: COLORS.santasGrey, marginTop: "4px" }}
              >
                {t("header.button.connectedWith")} {connector.name}
              </Typography>
            )}
          </Box>
        </Box>

        <Divider
          sx={{
            height: "1px",
            width: "100%",
            marginTop: isWrongNetwork ? "28px" : "56px",
            marginBottom: "20px",
          }}
        /> */}

        {/* <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
          <Button
            variant="text"
            fullWidth
            sx={{
              padding: "10px 12px 10px 8px !important",
              gap: "8px",
              alignItems: "center",
            }}
            onClick={handleClickDisconnect}
          >
            <SvgIcon
              sx={{
                "& path": {
                  fill: `${COLORS.greySuit}`,
                },
              }}
            >
              <Cross />
            </SvgIcon>

            <Typography
              variant="text2"
              sx={{ width: "100%", fontWeight: 600, textAlign: "left" }}
            >
              {t("header.button.disconnect")}
            </Typography>
          </Button>
        </Box> */}
      </Box>
    </Dialog>
  )
}
