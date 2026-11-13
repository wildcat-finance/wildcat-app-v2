import { ReactNode } from "react"

import { Box, TextField, Typography } from "@mui/material"

import { FieldLabelSx, ReadOnlyFieldSx, TextFieldSx } from "../style"

type KycTextFieldProps = {
  id: string
  label: ReactNode
  value: string
  placeholder: string
  type?: "text" | "email"
  autoComplete?: string
  disabled?: boolean
  readOnly?: boolean
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
}

export const KycTextField = ({
  id,
  label,
  value,
  placeholder,
  type = "text",
  autoComplete,
  disabled,
  readOnly,
  error,
  onChange,
  onBlur,
}: KycTextFieldProps) => (
  <Box sx={{ minWidth: 0, marginBottom: { md: "4px" } }}>
    <Typography
      variant="text3"
      component="label"
      htmlFor={id}
      sx={{ ...FieldLabelSx, display: "block" }}
    >
      {label}
    </Typography>
    <TextField
      id={id}
      size="medium"
      fullWidth
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      error={!!error}
      helperText={error}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      inputProps={{ autoComplete: autoComplete ?? "off", readOnly }}
      sx={readOnly ? ReadOnlyFieldSx : TextFieldSx}
    />
  </Box>
)
