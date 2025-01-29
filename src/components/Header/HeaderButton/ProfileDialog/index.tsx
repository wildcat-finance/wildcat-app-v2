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
import { EtherscanBaseUrl, TargetNetwork } from "@/config/network"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetController } from "@/hooks/useGetController"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export const ProfileDialog = ({
  open,
  handleClose,
  name,
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

  const { data: controller } = useGetController()
  const isRegisteredBorrower = controller?.isRegisteredBorrower

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <Box sx={ContentContainer} className="test">
        {isConnected && isWrongNetwork && (
          <Box sx={WrongNetworkContainer}>
            <Typography variant="text3" color={COLORS.dullRed}>
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

        <Box sx={ProfileContainer} marginTop={isWrongNetwork ? "24px" : "40px"}>
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
          </Box>
        </Box>

        <Divider
          sx={{
            height: "1px",
            width: "100%",
            marginTop: isWrongNetwork ? "28px" : "56px",
            marginBottom: "20px",
          }}
        />

        <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
          {isRegisteredBorrower && (
            <Link href={ROUTES.borrower.profile} onClick={handleClose}>
              <Button
                variant="text"
                fullWidth
                sx={{
                  padding: "10px 12px 10px 8px !important",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <SvgIcon
                  sx={{
                    "& path": {
                      fill: `${COLORS.greySuit}`,
                    },
                  }}
                >
                  <Profile />
                </SvgIcon>

                <Typography
                  variant="text2"
                  sx={{ width: "100%", fontWeight: 600, textAlign: "left" }}
                >
                  View Profile
                </Typography>
              </Button>
            </Link>
          )}

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
        </Box>
      </Box>
    </Dialog>
  )
}
