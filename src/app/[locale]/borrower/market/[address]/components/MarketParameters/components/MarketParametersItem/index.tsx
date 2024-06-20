import {
  Box,
  IconButton,
  Link,
  SvgIcon,
  Tooltip,
  Typography,
} from "@mui/material"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { TooltipIcon } from "@/components/InputLabel/style"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"

import { MarketParametersItemProps } from "./interface"
import {
  MarketParametersItemContainer,
  MarketParametersItemTitleContainer,
  MarketParametersItemValueContainer,
} from "./style"
import Copy from "../../../../../../../../../assets/icons/copy_icon.svg"
import LinkIcon from "../../../../../../../../../assets/icons/link_icon.svg"

export const MarketParametersItem = ({
  title,
  value,
  tooltipText,
  handleCopy,
  address,
}: MarketParametersItemProps) => (
  <Box sx={MarketParametersItemContainer}>
    <Box sx={MarketParametersItemTitleContainer}>
      <Typography
        variant="text3"
        sx={{ color: COLORS.santasGrey, fontWeight: "400" }}
      >
        {title}
      </Typography>{" "}
      {tooltipText && (
        <Tooltip title={tooltipText} placement="right">
          <SvgIcon fontSize="small" sx={TooltipIcon}>
            <Question />
          </SvgIcon>
        </Tooltip>
      )}
    </Box>

    <Box sx={MarketParametersItemValueContainer}>
      <Typography variant="text3" align="right">
        {value}
      </Typography>
      {handleCopy && (
        <IconButton disableRipple sx={AddressButtons} onClick={handleCopy}>
          <SvgIcon fontSize="medium">
            <Copy />
          </SvgIcon>
        </IconButton>
      )}
      {address && (
        <Link
          href={`${EtherscanBaseUrl}/address/${address}`}
          target="_blank"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <IconButton disableRipple sx={AddressButtons}>
            <SvgIcon fontSize="medium">
              <LinkIcon />
            </SvgIcon>
          </IconButton>
        </Link>
      )}
    </Box>
  </Box>
)
