import { SxProps } from "@mui/material"

export const WrapperAreaBoxSx: SxProps = {
  display: "flex",
  width: "100%",
}

export const ContentAreaBoxSx: SxProps = {
  flexGrow: 1,
}

export const PageTitleContainer = {
  width: "100%",
  padding: "42px 16px 32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  position: "sticky",
  top: 0,
  backgroundColor: "#fff",
  zIndex: 5,
}

export const MarketsTablesContainer = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  // height: "calc(100vh - 43px - 52px - 52px - 110px)",
  overflow: "hidden",
  overflowY: "visible",
}
