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
import { EtherscanBaseUrl, TargetNetwork } from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export const ProfileDialog = ({
  open,
  handleClose,
  name = "Wintermute Trading Ltd.",
}: ProfileDialogProps) => {
  const { t } = useTranslation()

  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { isWrongNetwork } = useCurrentNetwork()
  const { switchChain } = useSwitchChain()

  const handleClickDisconnect = () => {
    disconnect()
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <Box sx={ContentContainer} className="test">
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

        <Box sx={ProfileContainer} marginTop={name ? "12px" : "32px"}>
          <SvgIcon sx={{ fontSize: "44px" }}>
            <Avatar />
          </SvgIcon>

          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            rowGap="1px"
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
          </Box>
        </Box>

        <Divider sx={{ height: "1px", width: "100%", margin: "28px 0 20px" }} />

        <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
          <Link href={ROUTES.borrower.profile} onClick={handleClose}>
            <Button
              variant="text"
              fullWidth
              sx={{ padding: "10px 12px 10px 8px !important" }}
            >
              <Typography
                variant="text2"
                sx={{ width: "100%", fontWeight: 600, textAlign: "left" }}
              >
                View Profile
              </Typography>
            </Button>
          </Link>

          <Button
            variant="text"
            fullWidth
            sx={{ padding: "10px 12px 10px 8px !important" }}
            onClick={handleClickDisconnect}
          >
            <Typography
              variant="text2"
              sx={{ width: "100%", fontWeight: 600, textAlign: "left" }}
            >
              {t("header.button.disconnect")}
            </Typography>
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
