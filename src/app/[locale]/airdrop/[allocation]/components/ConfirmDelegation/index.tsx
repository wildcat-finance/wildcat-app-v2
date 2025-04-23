import {
  Box,
  Button,
  SvgIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { useParams, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import ProfileArrow from "@/assets/icons/profileArrow_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { AllocationAccountType } from "../../types"
import { AllocationAccount } from "../AllocationAccount"

export const ConfirmDelegation = ({
  setProgress,
  selectedAccount,
  handleSelectAccount,
}: {
  setProgress: (progress: number) => void
  selectedAccount: AllocationAccountType | null | string
  handleSelectAccount: (account: AllocationAccountType | string) => void
}) => {
  const { address } = useAccount()
  const { t } = useTranslation()
  const isStringAccount = typeof selectedAccount === "string"
  const isSelf = selectedAccount === address
  const theme = useTheme()
  const breakpoint = theme.breakpoints
  const isMobile = useMediaQuery(breakpoint.down("sm"))
  const { allocation } = useParams()
  const router = useRouter()

  const handleBack = () => {
    if (isSelf) {
      setProgress(20)
    } else {
      setProgress(40)
    }
  }

  const handleSign = () => {
    router.push(`/airdrop/${allocation}`)
  }

  return (
    <Box display="flex" flexDirection="column" height="100%" gap="24px">
      <Box
        display="flex"
        flexDirection="column"
        alignItems={isMobile ? "flex-start" : "center"}
        justifyContent={isMobile ? "flex-start" : "center"}
        gap="16px"
        height="100%"
        maxWidth="600px"
        margin="auto"
        width="100%"
      >
        <Box display="flex" alignItems="center" gap="8px">
          <SvgIcon viewBox="0 0 16 16">
            <ProfileArrow />
          </SvgIcon>
          <Typography variant="text3">
            {t("delegation.youDelegate")}
            <strong> 15,000 WETH </strong>
            {t("delegation.to")}
          </Typography>
        </Box>
        {!isStringAccount ? (
          <Box
            width={isMobile ? "auto" : "100%"}
            sx={{
              p: "16px",
              borderRadius: "8px",
              backgroundColor: COLORS.whiteSmoke,
              ml: isMobile ? "24px" : "0",
            }}
          >
            <AllocationAccount borders />
          </Box>
        ) : (
          <Box
            display="flex"
            gap="6px"
            p="4px 12px"
            borderRadius="8px"
            sx={{
              backgroundColor: isSelf ? COLORS.glitter : COLORS.whiteLilac,
              ml: isMobile ? "24px" : "0",
            }}
          >
            <Typography
              variant="text3"
              color={isSelf ? COLORS.blueRibbon : COLORS.blackRock}
            >
              {trimAddress(selectedAccount)}
            </Typography>
            <LinkGroup
              linkValue={`${EtherscanBaseUrl}/address/${selectedAccount}`}
              copyValue={selectedAccount}
            />
          </Box>
        )}
      </Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button
          startIcon={
            <SvgIcon sx={{ width: "16px", height: "16px" }}>
              <Arrow />
            </SvgIcon>
          }
          variant="text"
          color="primary"
          onClick={handleBack}
        >
          {t("delegation.back")}
        </Button>
        <Button variant="contained" color="primary" onClick={handleSign}>
          {t("delegation.sign")}
        </Button>
      </Box>
    </Box>
  )
}
