import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

import { ModalDataItemProps } from "./interface"
import { ItemContainer, ValueContainer } from "./style"

export const ModalDataItem = ({
  title,
  value,
  containerSx,
  valueColor,
  children,
}: ModalDataItemProps) => (
  <Box
    sx={{
      ...ItemContainer,
      ...containerSx,
    }}
  >
    <Typography variant="text3" color={COLORS.santasGrey}>
      {title}
    </Typography>

    <Box sx={ValueContainer}>
      <Typography variant="text3" color={valueColor}>
        {value}
      </Typography>

      {children}
    </Box>
  </Box>
)
