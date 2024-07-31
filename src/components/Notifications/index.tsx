import { Box, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import QuestionIcon from "@/assets/icons/circledQuestion_icon.svg"
import CloseIcon from "@/assets/icons/cross_icon.svg"
import {
  ContentContainer,
  Description,
  Dot,
  PenaltyDescription,
  TimeAgoContainer,
  TitleContainer,
  TypoContainer,
} from "@/components/Notifications/style"
import { NotificationsProps } from "@/components/Notifications/type"
import { COLORS } from "@/theme/colors"

export const Notifications = ({
  type = "normal",
  description,
  timeAgo,
  title,
}: NotificationsProps) => {
  switch (type) {
    case "normal": {
      return (
        <Box sx={ContentContainer}>
          <Box sx={TypoContainer}>
            <Typography variant="caption" sx={{ color: COLORS.greySuit }}>
              {timeAgo} ago
            </Typography>
            <Typography variant="text4" sx={Description}>
              {description}
            </Typography>
          </Box>
          <SvgIcon
            fontSize="big"
            sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
          >
            <CloseIcon />
          </SvgIcon>
        </Box>
      )
    }
    case "penalty": {
      return (
        <Box sx={ContentContainer}>
          <Box sx={TypoContainer}>
            <Box sx={TimeAgoContainer}>
              <Box sx={Dot} />
              <Typography variant="caption" sx={{ color: COLORS.greySuit }}>
                {timeAgo} ago
              </Typography>
            </Box>
            <Box sx={TitleContainer}>
              <Typography variant="text1">{title}</Typography>
              <SvgIcon
                fontSize="small"
                sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
              >
                <QuestionIcon />
              </SvgIcon>
            </Box>
            <Typography variant="text4" sx={PenaltyDescription}>
              {description}
            </Typography>
          </Box>
          <SvgIcon
            fontSize="big"
            sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
          >
            <CloseIcon />
          </SvgIcon>
        </Box>
      )
    }
    default: {
      return (
        <Box sx={ContentContainer}>
          <Box sx={TypoContainer}>
            <Typography variant="caption" sx={{ color: COLORS.greySuit }}>
              {timeAgo} ago
            </Typography>
            <Typography variant="text4" sx={{ width: "170px" }}>
              {description}
            </Typography>
          </Box>
          <SvgIcon
            fontSize="big"
            sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
          >
            <CloseIcon />
          </SvgIcon>
        </Box>
      )
    }
  }
}
