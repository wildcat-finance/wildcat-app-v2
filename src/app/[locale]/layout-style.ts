import Image from "@/assets/pictures/overviewBG.webp"

export const calcHeight = "calc(100vh - 43px - 52px - 52px - 110px - 36px)"

export const BackgroundContainer = {
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  position: "fixed",
  backgroundImage: `url(${Image.src})`,
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "100% 100%",

  zIndex: "-1",
}

export const PageContainer = {
  borderRadius: "12px 12px 0px 0px",
  backgroundColor: "white",

  display: "flex",
  flexDirection: "column",
  "@media (max-width: 1000px)": {
    backgroundColor: "transparent",
    borderRadius: "0px",
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
