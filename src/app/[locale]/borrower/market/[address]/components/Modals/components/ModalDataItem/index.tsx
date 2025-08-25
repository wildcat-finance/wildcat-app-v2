import { Box, Skeleton, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

import { ModalDataItemProps } from "./interface"
import { ItemContainer, ValueContainer } from "./style"

export const ModalDataItem = ({
  title,
  value,
  containerSx,
  valueColor,
  children,
  isLoading = false,
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

    {isLoading ? (
      <Skeleton height="20px" width="40px" sx={{ borderRadius: "6px" }} />
    ) : (
      <Box sx={ValueContainer}>
        <Typography variant="text3" color={valueColor}>
          {value}
        </Typography>

        {children}
      </Box>
    )}
  </Box>
)
