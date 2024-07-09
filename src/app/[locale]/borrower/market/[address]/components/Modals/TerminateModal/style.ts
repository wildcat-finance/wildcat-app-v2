import { COLORS } from "@/theme/colors"

export const TerminateModalDialog = {
  sx: {
    maxWidth: "440px",
    height: "440px",
    padding: "16px 0px 24px",
    borderRadius: "24px",
  },
}
export const TerminateModalRepatTextContainer = {
  backgroundColor: COLORS.glitter,
  borderRadius: "12px",
  margin: "0 24px",
  padding: "12px 20px",
}

export const MiddleContentContainer = {
  marginBottom: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
}

export const RepayContainer = {
  display: "flex",
  flexDirection: "column",
  margin: "0px 40px",
  gap: "8px",
}
export const TerminateMarketTextContainer = {
  margin: "auto",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "12px",
  alignItems: "center",
}

export const ContentContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
}

export const CheckIconContainer = {
  width: "20px",
  height: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: `1px solid ${COLORS.blueRibbon}`,
  borderRadius: "50%",
}
