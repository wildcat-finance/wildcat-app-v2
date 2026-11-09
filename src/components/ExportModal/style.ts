import { COLORS } from "@/theme/colors"

export const DialogSx = {
  "& .MuiDialog-paper": {
    width: "662px",
    maxWidth: { xs: "calc(100% - 32px)", sm: "calc(100% - 64px)" },
    maxHeight: { xs: "calc(100dvh - 32px)", sm: "calc(100dvh - 64px)" },
    margin: { xs: "16px", sm: "32px" },
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    padding: { xs: "20px 0", sm: "24px 0" },
    overflow: "hidden",
  },
}

export const SectionPaddingSx = { paddingX: { xs: "20px", sm: "24px" } }

export const HeaderSx = {
  ...SectionPaddingSx,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  paddingBottom: "4px",
}

export const BodySx = {
  ...SectionPaddingSx,
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
}

export const FooterSx = {
  ...SectionPaddingSx,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

export const FieldLabelSx = {
  color: COLORS.santasGrey,
  padding: "0 4px",
  marginBottom: "4px",
}

// These two mirror the theme's "contained" Tabs and Tab, so the control looks
// like the app's other segmented tabs while exposing radio semantics.
export const SegmentedControlSx = {
  boxSizing: "border-box",
  display: "flex",
  width: "100%",
  height: "40px",
  padding: "4px",
  borderRadius: "12px",
  backgroundColor: COLORS.whiteSmoke,
}

export const SegmentSx = {
  flex: "1 1 0",
  minWidth: 0,
  height: "32px",
  padding: { xs: "6px 4px", sm: "6px 8px" },
  borderRadius: "8px",
  overflow: "hidden",
  whiteSpace: "nowrap",
  fontFamily: "inherit",
  fontSize: { xs: "12px", sm: "13px" },
  fontWeight: 600,
  lineHeight: "20px",
  letterSpacing: 0,
  color: COLORS.santasGrey,
  '&[aria-checked="true"]': {
    color: COLORS.blackRock,
    backgroundColor: COLORS.white,
  },
  "&.Mui-disabled": { opacity: 0.38 },
  "&.Mui-focusVisible": {
    outline: `2px solid ${COLORS.cornflowerBlue}`,
    outlineOffset: "-2px",
  },
}

export const FormatPeriodRowSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 2fr)" },
  gap: { xs: "20px", sm: "12px" },
}

export const StatementRowSx = {
  justifyContent: "space-between",
  width: "100%",
  padding: "0 4px",
  "& .MuiFormControlLabel-label": {
    color: COLORS.blackRock,
    fontSize: "14px",
    lineHeight: "20px",
  },
}

export const MultilineFieldSx = {
  height: "auto",
  "& .MuiInputBase-root": {
    alignItems: "flex-start",
    height: "auto",
    minHeight: "44px",
    padding: "11px 16px",
  },
  "& .MuiInputBase-input": {
    padding: 0,
  },
  "& textarea": {
    lineHeight: "20px",
  },
}

export const AutocompleteFieldSx = {
  height: "auto",
  "& .MuiFormHelperText-root": {
    color: COLORS.santasGrey,
    paddingX: "4px",
  },
  "& .MuiAutocomplete-inputRoot": {
    minHeight: "44px",
    height: "auto",
    padding: "4px 6px 4px 12px !important",
  },
  "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input": {
    padding: "5px 4px",
  },
}

export const MultiAutocompleteFieldSx = {
  ...AutocompleteFieldSx,
  "& .MuiAutocomplete-inputRoot": {
    ...AutocompleteFieldSx["& .MuiAutocomplete-inputRoot"],
    flexWrap: "nowrap",
    paddingRight: "40px !important",
  },
}

export const AutocompletePopperSx = {
  maxWidth: "calc(100vw - 24px)",
  "& .MuiAutocomplete-listbox": {
    padding: 0,
    margin: 0,
  },
  "& .MuiPaper-root": {
    fontFamily: "inherit",
    minWidth: "0 !important",
    padding: "8px",
    marginTop: "2px",
    maxHeight: "300px",
  },
  "& .MuiAutocomplete-noOptions, & .MuiAutocomplete-loading": {
    padding: "6px 12px",
    fontSize: "14px",
    lineHeight: "20px",
    fontWeight: 500,
  },
}

export const ActionButtonSx = { minHeight: "44px" }

const noticePalette = {
  error: { background: COLORS.remy, color: COLORS.dullRed },
  info: { background: COLORS.glitter, color: COLORS.ultramarineBlue },
  success: { background: COLORS.lightGreen, color: "#168A4A" },
}

export const NoticeSx = (tone: keyof typeof noticePalette) => ({
  display: "flex",
  alignItems: "baseline",
  columnGap: "8px",
  padding: "10px 12px",
  borderRadius: "12px",
  backgroundColor: noticePalette[tone].background,
  color: noticePalette[tone].color,
  "& .notice-dot": {
    flexShrink: 0,
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    backgroundColor: noticePalette[tone].color,
    transform: "translateY(-3px)",
  },
})
