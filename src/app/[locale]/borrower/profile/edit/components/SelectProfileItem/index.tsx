import * as React from "react"

import { Box, Button, Skeleton, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { SelectProfileItemProps } from "@/app/[locale]/borrower/profile/edit/components/SelectProfileItem/interface"
import {
  BackButtonContainer,
  ComponentContainer,
  FieldContainer,
  PrevValueContainer,
} from "@/app/[locale]/borrower/profile/edit/components/style"
import Return from "@/assets/icons/return_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

export const SelectProfileItem = ({
  title,
  tooltip,
  form,
  oldValue,
  oldLabel,
  newValue,
  children,
  isLoading,
}: SelectProfileItemProps) => {
  const { t } = useTranslation()

  const hasValueChanged = oldValue !== newValue
  const valueWasntEmpty = oldValue && oldValue.length !== 0

  const handleRestoreValue = () => {
    form.setValue("entityKind", oldValue)
  }

  return (
    <Box sx={ComponentContainer}>
      <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <Typography variant="text3">{title}</Typography>
        <TooltipButton value={tooltip} />
      </Box>

      <Box sx={FieldContainer}>
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
          <Box sx={PrevValueContainer}>
            <Button
              variant="text"
              size="small"
              onClick={handleRestoreValue}
              sx={BackButtonContainer}
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
              {t("borrowerProfile.edit.buttons.back")}
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
