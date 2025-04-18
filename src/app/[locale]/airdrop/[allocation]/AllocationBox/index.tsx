import { Box, Button, Typography, SvgIcon } from "@mui/material"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import ReturnIcon from "@/assets/icons/return_icon.svg"
import { COLORS } from "@/theme/colors"

export const AllocationBox = ({ allocation }: { allocation: string }) => {
  const { t } = useTranslation()
  const router = useRouter()

  const handleClick = () => {
    router.push("/airdrop")
  }

  return (
    <Box
      sx={{
        display: "flex",
        padding: "12px",
        backgroundColor: COLORS.glitter,
        borderRadius: "12px",
        gap: "12px",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="text2" sx={{ color: COLORS.blueRibbon }}>
        {allocation}
      </Typography>
      <Box display="flex" alignItems="center">
        <Box
          sx={{
            height: "20px",
            width: "1px",
            backgroundColor: COLORS.cornflowerBlue,
            opacity: 0.5,
            display: { xs: "block", md: "none" },
          }}
        />
        <Button
          onClick={handleClick}
          variant="text"
          size="small"
          sx={{ color: COLORS.blueRibbon }}
        >
          <SvgIcon
            sx={{
              width: "12px",
              height: "12px",
              "& path": { fill: COLORS.blueRibbon },
              mr: "4px",
            }}
          >
            <ReturnIcon />
          </SvgIcon>
          {t("airdrop.allocation.tryAnother")}
        </Button>
      </Box>
    </Box>
  )
}
