import { COLORS } from "@/theme/colors"

export const CardContainer = {
  width: "100%",
  backgroundColor: COLORS.white,
  padding: "12px",
  borderRadius: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
}

export const StatusAndTermContainer = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
}

export const MainInfoContainer = { width: "100%", display: "flex", gap: "4px" }

export const MainInfoColumnContainer = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
}

export const AprWithdrawalContainer = { display: "flex", gap: "10px" }

export const AprWithdrawalItemContainer = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
}

export const AprWithdrawalChipContainer = {
  display: "flex",
  paddingX: "6px",
  borderRadius: "12px",
  bgcolor: COLORS.whiteSmoke,
}

export const CardFooterContainer = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}

export const CardFooterButtonsContainer = { display: "flex", gap: "6px" }

export const CardFooterButtonContainer = {
  borderRadius: "8px",
  padding: "6px 14px",
  minWidth: "fit-content !important",
}
