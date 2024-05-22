import { Box, Tooltip, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import {
  InputContainer,
  InputLabelContainer,
  InputLabelSubtitle,
  InputLabelTypo,
  TooltipIcon,
} from "@/components/InputLabel/style"
import { InputLabelProps } from "@/components/InputLabel/type"
import { COLORS } from "@/theme/colors"

export const InputLabel = ({
  label,
  subtitle,
  margin,
  tooltipText,
  children,
}: InputLabelProps) => (
  <Box margin={margin} sx={InputContainer}>
    <Box sx={InputLabelContainer} marginBottom={!subtitle ? "8px" : ""}>
      <Box sx={InputLabelTypo}>
        <Typography variant="text3">{label}</Typography>
      </Box>
      <Tooltip title={tooltipText} placement="right">
        <SvgIcon fontSize="small" sx={TooltipIcon}>
          <Question />
        </SvgIcon>
      </Tooltip>
    </Box>
    {subtitle && (
      <Typography variant="text4" sx={InputLabelSubtitle}>
        {subtitle}
      </Typography>
    )}
    {children}
  </Box>
)
