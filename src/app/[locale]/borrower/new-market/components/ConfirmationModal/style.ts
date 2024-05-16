import { COLORS } from "@/theme/colors"

export const ConfirmButton = { width: "140px" }

export const DialogContainer = {
  "& .MuiDialog-paper": {
    height: "776px",
    width: "620px",
    borderRadius: "20px",
    border: "none",
    margin: 0,
    padding: 0,
  },
}

export const HeaderModalContainer = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",

  padding: "20px 24px",
  borderBottom: `1px solid ${COLORS.athensGrey}`,
}

export const BackArrowButton = {
  "& path": { fill: `${COLORS.bunker}` },
}

export const CrossButton = {
  "& path": { fill: `${COLORS.santasGrey}` },
}

export const FormModalContainer = { padding: "20px 24px", overflow: "scroll" }

export const FormModalGroupContainer = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px 20px",
}

export const MLATitle = { color: COLORS.santasGrey }

export const MLAButton = { width: "fit-content" }

export const DividerStyle = { margin: "16px 0" }

export const Gradient = {
  position: "absolute",
  bottom: "8%",
  height: "170px",
  width: "100%",
  backgroundImage: "linear-gradient(1deg, #FFFFFF 45%, #FFFFFF00 73%)",
  pointerEvents: "none",
}

export const FooterModalContainer = {
  display: "flex",
  flexDirection: "column",
  rowGap: "16px",
  padding: "0 24px 20px 24px",
  marginTop: "auto",
}

export const ButtonContainer = {
  display: "flex",
  columnGap: "8px",
}

export const ButtonStyle = { width: "100%" }

export const Note = {
  width: "550px",
  padding: "0 20px 0 20px",
  textAlign: "center",
  color: COLORS.santasGrey,
}
