import { ReactNode } from "react"
import * as React from "react"

import { Box, Button, Skeleton, SvgIcon, Typography } from "@mui/material"
import { UseFormReturn } from "react-hook-form"

import { PrivateValidationSchemaType } from "@/app/[locale]/borrower/profile/edit/hooks/useEditPrivateForm"
import Return from "@/assets/icons/return_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

export type EditProfileItemProps = {
  title: string
  tooltip: string
  form: UseFormReturn<PrivateValidationSchemaType>
  oldValue: string | undefined
  oldLabel: string | undefined
  newValue?: string
  children: ReactNode
  isLoading: boolean
}

export const SelectProfileItem = ({
  title,
  tooltip,
  form,
  oldValue,
  oldLabel,
  newValue,
  children,
  isLoading,
}: EditProfileItemProps) => {
  const hasValueChanged = oldValue !== newValue
  const valueWasntEmpty = oldValue && oldValue.length !== 0

  const handleRestoreValue = () => {
    form.setValue("legalNature", oldValue)
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <Typography variant="text3">{title}</Typography>
        <TooltipButton value={tooltip} />
      </Box>

      <Box
        sx={{
          height: "fit-content",
          width: "100%",
          display: "flex",
          gap: "20px",
          alignItems: "center",
        }}
      >
        {isLoading ? (
          <Skeleton
            height="52px"
            width="60.8%"
            sx={{ bgcolor: COLORS.athensGrey, borderRadius: "12px" }}
          />
        ) : (
          <Box sx={{ width: "60.8%" }}>{children}</Box>
        )}

        {hasValueChanged && valueWasntEmpty && !isLoading && (
          <Box
            sx={{ display: "flex", flexDirection: "column", maxWidth: "35%" }}
          >
            <Button
              variant="text"
              size="small"
              onClick={handleRestoreValue}
              sx={{
                color: COLORS.ultramarineBlue,
                width: "fit-content",
                borderRadius: 0,
                minWidth: "56px",
                padding: 0,
                gap: "4px",

                "&:hover": {
                  boxShadow: "none",
                  backgroundColor: "transparent",
                  color: COLORS.ultramarineBlue,
                },
              }}
            >
              <SvgIcon
                fontSize="small"
                sx={{
                  "& path": {
                    fill: COLORS.ultramarineBlue,
                  },
                }}
              >
                <Return />
              </SvgIcon>
              Back to
            </Button>
            <Typography variant="text3" color={COLORS.santasGrey}>
              {oldLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
