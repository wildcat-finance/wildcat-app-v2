import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type ConfirmationFormItemProps = {
  label: string
  value: string | number
}

export const ConfirmationFormItem = ({
  label,
  value,
}: ConfirmationFormItemProps) => (
  <Box display="flex" flexDirection="column" rowGap="5px">
    <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
      {label}
    </Typography>
    <Typography variant="text2" sx={{ height: "20px" }}>
      {value}
    </Typography>
  </Box>
)
