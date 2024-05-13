import { Box, Tooltip, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import Question from "@/assets/icons/circledQuestion_icon.svg"
import {
  InputContainer,
  InputLabelContainer,
  TooltipIcon,
} from "@/components/InputLabel/style"
import { InputLabelProps } from "@/components/InputLabel/type"

export const InputLabel = ({ label, margin, children }: InputLabelProps) => (
  <Box margin={margin} sx={InputContainer}>
    <Box sx={InputLabelContainer}>
      <Typography variant="text3">{label}</Typography>
      <Tooltip
        title="Description here"
        placement="right"
        // TransitionProps={{ timeout: 400 }}
      >
        <SvgIcon fontSize="small" sx={TooltipIcon}>
          <Question />
        </SvgIcon>
      </Tooltip>
    </Box>
    {children}
  </Box>
)
