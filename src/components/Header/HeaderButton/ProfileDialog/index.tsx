import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  SvgIcon,
} from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useCopyToClipboard } from "react-use"
import { useAccount, useDisconnect, useSwitchChain } from "wagmi"
import { sepolia } from "wagmi/chains"

import {
  AddressButtons,
  AddressContainer,
  ContentContainer,
  DialogContainer,
  ProfileContainer,
  WrongNetworkButton,
  WrongNetworkContainer,
} from "@/components/Header/HeaderButton/ProfileDialog/style"
import { ProfileDialogProps } from "@/components/Header/HeaderButton/ProfileDialog/type"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl, TargetNetwork } from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { COLORS } from "@/theme/colors"

import Copy from "../../../../assets/icons/copy_icon.svg"
import LinkIcon from "../../../../assets/icons/link_icon.svg"

export const ProfileDialog = ({
  open,
  handleClose,
  name,
}: ProfileDialogProps) => {
  const { t } = useTranslation()
  const [state, copyToClipboard] = useCopyToClipboard()

  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { isWrongNetwork } = useCurrentNetwork()
  const { switchChain } = useSwitchChain()

  const handleCopyAddress = (text: string) => {
    copyToClipboard(text)
  }

  const handleClickDisconnect = () => {
    disconnect()
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <Box sx={ContentContainer}>
        {isConnected && isWrongNetwork && (
          <Box sx={WrongNetworkContainer}>
            <Typography variant="text3">
              {t("header.button.wrongNetwork")}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              sx={WrongNetworkButton}
              onClick={() => switchChain({ chainId: sepolia.id })}
            >
              {t("header.button.switchNetwork")} {TargetNetwork.name}
            </Button>
          </Box>
        )}

        <Box sx={ProfileContainer}>
          <Box
            width="32px"
            height="32px"
            bgcolor="#F4F4F8"
            borderRadius="50%"
          />
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            rowGap="2px"
          >
            {address && (
              <Box sx={AddressContainer}>
                <Typography variant="text1">
                  {address.slice(0, 4)}..{address.slice(-4, address.length)}
                </Typography>

                <LinkGroup
                  copyValue={address?.toString()}
                  linkValue={`${EtherscanBaseUrl}/address/${address}`}
                />
              </Box>
            )}
            {name && (
              <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
                {name}
              </Typography>
            )}
          </Box>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={handleClickDisconnect}
        >
          <Typography variant="text2">
            {t("header.button.disconnect")}
          </Typography>
        </Button>
      </Box>
    </Dialog>
  )
}
