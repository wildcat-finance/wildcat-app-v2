import { COLORS } from "@/theme/colors"

export const DeployHeaderContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "24px 24px 0",
}

export const DeployCloseButtonIcon = { "& path": { fill: `${COLORS.black}` } }

export const DeployContentContainer = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
}

export const DeployMainContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  rowGap: "24px",
}

export const DeployTypoBox = {
  display: "flex",
  flexDirection: "column",
  rowGap: "8px",
  alignItems: "center",
}

export const DeploySubtitle = {
  color: COLORS.santasGrey,
  width: "250px",
  textAlign: "center",
}

export const DeployButtonContainer = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  rowGap: "8px",
}
