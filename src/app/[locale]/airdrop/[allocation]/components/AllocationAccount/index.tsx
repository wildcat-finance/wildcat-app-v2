"use client"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import LinkedinIcon from "@/assets/icons/linkedin_icon.svg"
import SiteIcon from "@/assets/icons/site_icon.svg"
import WhiteWildcat from "@/assets/icons/white_wildcat.svg"
import XIcon from "@/assets/icons/x_icon.svg"
import ConfirmStepBg from "@/assets/pictures/sale_token_modal_confirm_bg.webp"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export const AllocationAccount = ({
  handleSelect,
}: {
  handleSelect: () => void
}) => {
  const { t } = useTranslation()
  const account = {
    ens: "robbie.eth",
    location: "United States",
    address: "0x1234567890123456789012345678901234567890",
    description:
      "Any description of token we need here to seem transparent and useful, any description of token we need here to seem transparent and useful",
  }
  return (
    <Box display="flex" flexDirection="column" gap="12px">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" gap="12px">
          <Box
            sx={{
              backgroundImage: `url(${ConfirmStepBg.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              mt: "2px",
            }}
          >
            <WhiteWildcat />
          </Box>
          <Box display="flex" flexDirection="column">
            <Typography variant="text2">{account.ens}</Typography>
            <Typography variant="text4" color={COLORS.concreetGrey}>
              {account.location}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            background: COLORS.salad,
            borderRadius: "14px",
            p: "2px 8px",
            height: "28px",
          }}
        >
          <Typography variant="text3" color={COLORS.forestGreen}>
            4.9m VP
          </Typography>
        </Box>
      </Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-end">
        <Box display="flex" flexDirection="column" gap="12px">
          <Box display="flex" gap="4px">
            <Typography
              variant="text2"
              maxWidth="280px"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              color={COLORS.concreetGrey}
            >
              {account.description}
            </Typography>
            <Typography variant="text2" color={COLORS.blueRibbon}>
              {t("airdrop.delegation.more")}
            </Typography>
          </Box>
          <Box display="flex" gap="6px">
            <Box
              display="flex"
              gap="6px"
              p="4px 12px"
              borderRadius="8px"
              sx={{
                backgroundColor: COLORS.whiteSmoke,
              }}
            >
              <Typography variant="text3" color={COLORS.blackRock}>
                {trimAddress(account.address)}
              </Typography>
              <LinkGroup
                linkValue={`${EtherscanBaseUrl}/address/${account.address}`}
                copyValue={account.address}
              />
            </Box>
            <Box
              display="flex"
              alignItems="center"
              p="4px 12px"
              borderRadius="8px"
              sx={{
                backgroundColor: COLORS.whiteSmoke,
              }}
            >
              <LinkedinIcon />
            </Box>
            <Box
              display="flex"
              alignItems="center"
              p="4px 12px"
              borderRadius="8px"
              sx={{
                backgroundColor: COLORS.whiteSmoke,
              }}
            >
              <SiteIcon />
            </Box>
            <Box
              display="flex"
              alignItems="center"
              p="4px 12px"
              borderRadius="8px"
              sx={{
                backgroundColor: COLORS.whiteSmoke,
              }}
            >
              <XIcon />
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          size="small"
          sx={{ height: "28px" }}
          onClick={handleSelect}
        >
          {t("airdrop.delegation.select")}
        </Button>
      </Box>
    </Box>
  )
}
