import { Box, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { COLORS } from "@/theme/colors"
import Icon from "../../assets/icons/cross_icon.svg"

type NotificationsProps = {
  type?: "normal" | "penalty"
  timeAgo: string
  title?: string
  description: string
}

export const Notifications = ({
  type = "normal",
  description,
  timeAgo,
  title,
}: NotificationsProps) => {
  switch (type) {
    case "normal": {
      return (
        <Box
          sx={{
            width: "225px",
            padding: "12px",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: COLORS.blackRock03,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              rowGap: "6px",
            }}
          >
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
            <Icon />
          </SvgIcon>
        </Box>
      )
    }
    case "penalty": {
      return (
        <Box
          sx={{
            width: "225px",
            padding: "12px",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: COLORS.blackRock03,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              rowGap: "6px",
            }}
          >
            <Box
              sx={{ display: "flex", columnGap: "4px", alignItems: "center" }}
            >
              <Box
                sx={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: COLORS.carminePink,
                }}
              />
              <Typography variant="caption" sx={{ color: COLORS.greySuit }}>
                {timeAgo} ago
              </Typography>
            </Box>
            <Typography variant="text1">{title}</Typography>
            <Typography
              variant="text4"
              sx={{ width: "170px", color: COLORS.santasGrey }}
            >
              {description}
            </Typography>
          </Box>
          <SvgIcon
            fontSize="big"
            sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
          >
            <Icon />
          </SvgIcon>
        </Box>
      )
    }
    default: {
      return (
        <Box
          sx={{
            width: "225px",
            padding: "12px",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: COLORS.blackRock03,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              rowGap: "6px",
            }}
          >
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
            <Icon />
          </SvgIcon>
        </Box>
      )
    }
  }
}
