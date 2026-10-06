import { COLORS } from "@/theme/colors"

export const InvitationPageContainer = {
  width: "100%",
  flex: "1 1 auto",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
  backgroundColor: COLORS.white,
  padding: "24px 24px 0",

  "@media (max-width: 1000px)": {
    padding: "16px 12px 0",
    borderRadius: "14px",
  },

  "@media (max-height: 900px) and (min-width: 1001px)": {
    paddingTop: "18px",
  },
}

export const InvitationContent = {
  width: "100%",
  maxWidth: "860px",
  flex: "1 1 auto",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  boxSizing: "border-box",
}

export const InvitationHeader = {
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: "6px",

  "@media (max-height: 900px) and (min-width: 1001px)": {
    marginBottom: "2px",
  },
}

export const BorrowerNameField = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

export const BorrowerNameLabel = {
  color: COLORS.black,
}

export const BorrowerNameInput = {
  width: "100%",
  height: "44px",
  boxSizing: "border-box",
  padding: "0 18px",
  border: `1px solid ${COLORS.whiteLilac}`,
  borderRadius: "8px",
  backgroundColor: COLORS.white,
  color: COLORS.blackRock,
  transition: "border-color 0.2s, box-shadow 0.2s",

  "&:hover": {
    borderColor: COLORS.greySuit,
  },

  "&.Mui-focused": {
    borderColor: COLORS.blackRock07,
    boxShadow: "0 0 0 3px rgba(48, 49, 62, 0.06)",
  },

  "& .MuiInputBase-input": {
    padding: 0,
    fontSize: "17px",
    lineHeight: "26px",
    fontWeight: 500,
  },
}

export const BorrowerNameNote = {
  maxWidth: "820px",
  color: COLORS.santasGrey,
  margin: "-4px 0 4px",

  "& strong": {
    color: COLORS.blackRock,
    fontWeight: 600,
  },
}

export const TermsPanel = {
  flex: "1 1 360px",
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: `1px solid ${COLORS.whiteLilac}`,
  borderRadius: "8px",
  backgroundColor: COLORS.white,
}

export const TermsHeader = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 18px",
  borderBottom: `1px solid ${COLORS.athensGrey}`,

  "@media (max-width: 1000px)": {
    padding: "14px 16px",
  },
}

export const TermsTitle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  columnGap: "14px",
  rowGap: "8px",
  minWidth: 0,

  "@media (max-width: 1000px)": {
    flexWrap: "wrap",
  },
}

export const TermsBody = {
  flex: "1 1 auto",
  minHeight: 0,
  minWidth: 0,
  position: "relative",
  padding: "14px 8px 14px 18px",

  "&::after": {
    content: '""',
    position: "absolute",
    left: "18px",
    right: "18px",
    bottom: 0,
    height: "34px",
    pointerEvents: "none",
    backgroundImage: `linear-gradient(180deg, ${COLORS.white}00 0%, ${COLORS.white} 88%)`,
  },

  "@media (max-width: 1000px)": {
    padding: "14px 4px 14px 14px",

    "&::after": {
      left: "14px",
      right: "14px",
    },
  },
}

export const AgreementTextScroll = {
  height: "100%",
  maxHeight: "none",
  minHeight: 0,
  overflowX: "hidden",
  overflowY: "auto",
  rowGap: "16px",
  paddingRight: "12px",
  paddingBottom: "44px",
  overscrollBehavior: "contain",
  scrollbarColor: `${COLORS.greySuit} transparent`,
  scrollbarWidth: "thin",

  "&::-webkit-scrollbar": {
    width: "10px",
  },

  "&::-webkit-scrollbar-track": {
    backgroundColor: "transparent",
  },

  "&::-webkit-scrollbar-thumb": {
    backgroundColor: COLORS.greySuit,
    borderRadius: "999px",
    border: "2px solid transparent",
    backgroundClip: "content-box",
  },

  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: COLORS.santasGrey,
  },

  "& .MuiTypography-root": {
    overflowWrap: "anywhere",
  },
}

export const InvitationActions = {
  width: "100%",
  flexShrink: 0,
  display: "flex",
  justifyContent: "center",
  boxSizing: "border-box",
  padding: "14px 0 20px",
  marginTop: "12px",
  borderTop: `1px solid ${COLORS.athensGrey}`,
  backgroundColor: COLORS.white,

  "@media (max-width: 1000px)": {
    padding: "12px 0",
    marginTop: "12px",
  },
}

export const InvitationActionsInner = {
  width: "100%",
  maxWidth: "860px",
  display: "flex",
  justifyContent: "center",
  gap: "12px",

  "@media (max-width: 1000px)": {
    flexDirection: "column",
    gap: "8px",
  },
}

export const ActionButton = {
  minWidth: "168px",

  "@media (max-width: 1000px)": {
    width: "100%",
  },
}

export const InvitationStatePanel = {
  width: "100%",
  minHeight: 0,
  flex: "1 1 auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  padding: "40px 20px",
  textAlign: "center",
  boxSizing: "border-box",
}

export const StateDescription = {
  maxWidth: "420px",
  color: COLORS.santasGrey,
}
