import Image from "@/assets/pictures/bannerBG.webp"
import { COLORS } from "@/theme/colors"

/* The lead banner is always a dark, brand-image background — its content
 * sits on a deliberately dark photographic surface in both light and dark
 * mode. Static colors keep it consistent regardless of theme. */
export const MarketListAlertContainer = {
  width: "100%",
  height: "min-content",

  display: "flex",
  flexDirection: "column",
  gap: "24px",

  padding: "28px 40px 32px 32px",
  borderRadius: "16px",
  color: COLORS.staticWhite,

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
  backgroundColor: COLORS.staticWhite,
  color: "#141414",
  border: "none",
  fontWeight: 600,
  "&:hover": {
    background: "#E6E7EB",
    color: "#141414",
    boxShadow: "none",
  },
}
