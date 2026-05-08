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

  "@media (max-width: 1000px)": {
    height: "100dvh",
  },
}

export const RootScaffold = {
  position: "relative",
  height: "100dvh",
  display: "flex",
  flexDirection: "column",
}

export const PageContainer = {
  borderRadius: "12px 12px 0px 0px",
  backgroundColor: "white",

  display: "flex",
  flexDirection: "column",

  flex: "1 1 auto",
  minHeight: 0,

  "@media (max-width: 1000px)": {
    backgroundColor: "transparent",
    borderRadius: "0px",
  },
}

export const ContentContainer = {
  width: "100%",
  display: "flex",
  flexDirection: "row",

  flex: "1 1 auto",
  minHeight: 0,
  minWidth: 0,

  "@media (max-width: 1000px)": {
    paddingX: "4px",
    paddingBottom: "4px",
  },
}

export const ContentArea = {
  flex: "1 1 0",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
}
