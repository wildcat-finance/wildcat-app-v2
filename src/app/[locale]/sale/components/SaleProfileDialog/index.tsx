import {
  Box,
  Button,
  Dialog,
  Divider,
  SvgIcon,
  Typography,
} from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount, useDisconnect, useSwitchChain } from "wagmi"
import { sepolia } from "wagmi/chains"

import Avatar from "@/assets/icons/avatar_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import Profile from "@/assets/icons/profile_icon.svg"
import {
  AddressContainer,
  ContentContainer,
  DialogContainer,
  ProfileContainer,
  WrongNetworkButton,
  WrongNetworkContainer,
} from "@/components/Header/HeaderButton/ProfileDialog/style"
import { ProfileDialogProps } from "@/components/Header/HeaderButton/ProfileDialog/type"
import { LinkGroup } from "@/components/LinkComponent"
import {
  EtherscanBaseUrl,
  TargetChainId,
  TargetNetwork,
} from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetController } from "@/hooks/useGetController"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export const SaleProfileDialog = ({
  open,
  handleClose,
  name,
}: ProfileDialogProps) => {
  const { t } = useTranslation()

  const { address, isConnected, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { isWrongNetwork } = useCurrentNetwork()
  const { switchChain } = useSwitchChain()

  const handleClickDisconnect = () => {
    disconnect()
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <Box sx={ContentContainer}>
        {isConnected && isWrongNetwork && (
          <Box sx={WrongNetworkContainer}>
            <Typography variant="text3" color={COLORS.dullRed}>
              {t("header.button.wrongNetwork")}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              sx={WrongNetworkButton}
              onClick={() => switchChain({ chainId: TargetChainId })}
            >
              {t("header.button.switchNetwork")} {TargetNetwork.name}
            </Button>
          </Box>
        )}

        <Box sx={ProfileContainer} marginTop={isWrongNetwork ? "12px" : "38px"}>
          <SvgIcon sx={{ fontSize: "44px" }}>
            <Avatar />
          </SvgIcon>

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

            {name && (
              <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
                {name}
              </Typography>
            )}
            {connector?.name && (
              <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
                {t("header.button.connectedWith")} {connector.name}
              </Typography>
            )}
          </Box>
        </Box>

        <Button
          fullWidth
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleClickDisconnect}
          sx={{ marginTop: "auto" }}
        >
          {t("header.button.disconnect")}
        </Button>
      </Box>
    </Dialog>
  )
}
