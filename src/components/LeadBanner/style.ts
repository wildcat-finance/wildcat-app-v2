import Image from "@/assets/pictures/banner_bg.png"
import { COLORS } from "@/theme/colors"

export const MarketListAlertContainer = {
  width: "100%",
  height: "min-content",

  display: "flex",
  flexDirection: "column",
  gap: "24px",

  padding: "28px 40px 32px 32px",
  marginBottom: "32px",
  borderRadius: "16px",
  color: "white",

  backgroundImage: `url(${Image.src})`,
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
}

export const TextContainer = {
  width: "400px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

export const RequestButton = {
  width: "196px",
  backgroundColor: COLORS.white,
  color: COLORS.bunker,
  border: "none",
  "&:hover": {
    background: "#DEDEDE",
    boxShadow: "none",
  },
}
