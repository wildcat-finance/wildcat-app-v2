import { COLORS } from "@/theme/colors"

export const LoadingDialogContainer = {
  "& .MuiDialog-paper": {
    height: "400px",
    width: "440px",
    borderRadius: "20px",
    borderColor: COLORS.black01,
    margin: 0,
    padding: "24px",
  },
}

export const CloseButtonIcon = { "& path": { fill: `${COLORS.black}` } }

export const TitleContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

export const LoadingContentContainer = {
  marginTop: "102px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  rowGap: "24px",
}

export const LoadingTypoBox = {
  display: "flex",
  flexDirection: "column",
  rowGap: "8px",
  alignItems: "center",
}

export const LoadingSubtitle = {
  color: COLORS.santasGrey,
  width: "250px",
  textAlign: "center",
}
