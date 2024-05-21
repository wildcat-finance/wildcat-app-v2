import { COLORS } from "@/theme/colors"

export const FinalDialogContainer = {
  "& .MuiDialog-paper": {
    height: "400px",
    width: "440px",
    borderRadius: "20px",
    borderColor: COLORS.black01,
    margin: 0,
    padding: "24px",
  },
}

export const FinalCloseButtonIcon = { "& path": { fill: `${COLORS.black}` } }

export const FinalTitleContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

export const FinalContentContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  rowGap: "24px",
}

export const FinalTypoBox = {
  display: "flex",
  flexDirection: "column",
  rowGap: "8px",
  alignItems: "center",
}

export const FinalSubtitle = {
  color: COLORS.santasGrey,
  width: "250px",
  textAlign: "center",
}

export const FinalButtonContainer = {
  marginTop: "auto",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  rowGap: "8px",
}
