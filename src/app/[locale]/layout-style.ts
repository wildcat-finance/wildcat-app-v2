import Image from "@/assets/pictures/overviewBG.webp"
import { COLORS, TOKENS } from "@/theme/colors"

export const calcHeight = "calc(100vh - 43px - 52px - 52px - 110px - 36px)"

/**
 * Hero strip behind the header. In light mode this is the brand banner
 * image; in dark mode the image is suppressed and replaced with a layered
 * gradient that gives the page a deliberate, finished hero treatment
 * instead of "just plain dark." Static brightness/contrast tweaks keep
 * the image legible in light mode without washing out the header text.
 */
export const BackgroundContainer = {
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  position: "fixed",
  backgroundColor: TOKENS.surfaceCanvas,
  backgroundImage: `url(${Image.src})`,
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "100% 100%",

  zIndex: "-1",

  '[data-theme="dark"] &': {
    backgroundImage: [
      // Soft neutral vignette in the upper-center
      "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(180, 180, 195, 0.07), transparent 60%)",
      // Faint warm-grey accent on the right
      "radial-gradient(ellipse 60% 80% at 90% 0%, rgba(200, 180, 170, 0.04), transparent 55%)",
      // Bottom fade to the deep canvas
      "linear-gradient(180deg, rgba(18, 18, 22, 0.0) 0%, #08090b 70%)",
      // Charcoal base
      "linear-gradient(180deg, #15161a 0%, #08090b 100%)",
    ].join(", "),
  },

  "@media (max-width: 1000px)": {
    height: "100dvh",
  },
}

export const PageContainer = {
  borderRadius: "12px 12px 0px 0px",
  backgroundColor: TOKENS.surfaceBase,

  display: "flex",
  flexDirection: "column",

  // Hairline at the page-surface edge gives the card a deliberate boundary
  // against the dark hero canvas. Drawn via box-shadow so it doesn't fight
  // the rounded corners.
  '[data-theme="dark"] &': {
    boxShadow: `inset 0 1px 0 0 ${COLORS.staticWhiteAlpha10}`,
  },

  "@media (max-width: 1000px)": {
    backgroundColor: "transparent",
    borderRadius: "0px",
    '[data-theme="dark"] &': {
      boxShadow: "none",
    },
  },
}

export const ContentContainer = {
  height: "calc(100vh - 82px)",
  width: "100%",
  display: "flex",
  flexDirection: "row",

  "@media (max-width: 1000px)": {
    height: "calc(100dvh - 68px)",
    paddingX: "4px",
    paddingBottom: "4px",
  },
}
