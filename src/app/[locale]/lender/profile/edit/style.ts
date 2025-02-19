export const EditPageContainer = {
  height: "calc(100vh - 43px - 43px - 52px)",
  overflow: "scroll",
  padding: "52px 20px 0 44px",
  display: "flex",
  flexDirection: "column",
}

export const TitleContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "32px",
}

export const FieldsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "36px",
}

export const DescriptionField = {
  "&.MuiFormControl-root.MuiTextField-root": {
    height: "fit-content",
  },

  "& .MuiFilledInput-root": {
    padding: "16px !important",
  },

  "& .MuiInputBase-input": {
    padding: "0 !important",
  },
}

export const SelectStyles = {
  "& .MuiPaper-root": {
    width: "47.5%",
  },
}

export const ButtonsContainer = {
  marginTop: "40px",
  width: "60.8%",
  display: "flex",
  justifyContent: "space-between",
}
