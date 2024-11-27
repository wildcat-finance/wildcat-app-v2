import { forwardRef, ReactNode } from "react"

import { InputAdornment, TextField, TextFieldProps } from "@mui/material"
import { NumericFormat, NumericFormatProps } from "react-number-format"

type NumberTextFieldProps = Omit<
  NumericFormatProps,
  "customInput" | "size" | "color"
> & {
  fieldSize?: string
  endAdornment?: ReactNode
  label?: ReactNode
  error?: boolean
  helperText?: string
  size?: TextFieldProps["size"]
  sx?: TextFieldProps["sx"]
  FormHelperTextProps?: TextFieldProps["FormHelperTextProps"]
}

export const NumberTextField = forwardRef<TextFieldProps, NumberTextFieldProps>(
  (props, ref) => {
    const {
      onChange,
      min = 0,
      max,
      endAdornment,
      label,
      error,
      helperText,
      decimalScale = 5,
      size,
      sx,
      FormHelperTextProps,
      ...rest
    } = props

    return (
      <NumericFormat
        customInput={TextField}
        {...{
          sx,
          label,
          error,
          helperText,
          FormHelperTextProps,
          size,
          InputProps: {
            ...{
              endAdornment: (
                <InputAdornment position="end">{endAdornment}</InputAdornment>
              ),
            },
          },
        }}
        getInputRef={ref}
        onChange={onChange}
        decimalScale={decimalScale}
        decimalSeparator="."
        allowNegative={false}
        isAllowed={(values) => {
          const { floatValue, value } = values

          if (value.charAt(0) === "0") {
            const secondChar = value.charAt(1)

            // Decimals are not allowed: don't allow zero to be followed by a number
            if (!decimalScale && secondChar) {
              return false
            }

            // Decimals are allowed: allow zero followed only by a dot
            if (decimalScale && secondChar && secondChar !== ".") {
              return false
            }
          }

          // Don't allow dots at the beginning
          if (value.startsWith(".")) {
            return false
          }

          // Check if the value is bigger than the max or smaller than the min
          if (floatValue !== undefined) {
            const isBiggerThanMax =
              max !== undefined && floatValue > Number(max)
            const isSmallerThanMin =
              min !== undefined && floatValue < Number(min)

            return !isBiggerThanMax && !isSmallerThanMin
          }

          return true
        }}
        {...rest}
      />
    )
  },
)
