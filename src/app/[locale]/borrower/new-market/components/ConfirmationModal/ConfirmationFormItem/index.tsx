import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type ConfirmationFormItemProps = {
  label: string
  value: string
}

export const ConfirmationFormItem = ({
  label,
  value,
}: ConfirmationFormItemProps) => (
  <Box display="flex" flexDirection="column" rowGap="2px">
    <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
      {label}
    </Typography>
    <Typography variant="text2" sx={{height: "20px"}}>{value}</Typography>
  </Box>
)
