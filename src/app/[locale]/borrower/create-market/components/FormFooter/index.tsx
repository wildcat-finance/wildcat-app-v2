import { Box, Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { COLORS } from "@/theme/colors"

import { FormFooterProps } from "./interface"
import { FooterContainer } from "./style"

export const FormFooter = ({
  backOnClick,
  nextOnClick,
  disableNext,
}: FormFooterProps) => (
  <Box sx={FooterContainer}>
    <Button
      size="large"
      variant="text"
      sx={{ justifyContent: "flex-start" }}
      onClick={backOnClick}
    >
      <SvgIcon
        fontSize="medium"
        sx={{
          marginRight: "4px",
          "& path": { fill: `${COLORS.bunker}` },
        }}
      >
        <BackArrow />
      </SvgIcon>
      Back
    </Button>

    <Button
      size="large"
      variant="contained"
      sx={{ width: "140px" }}
      disabled={disableNext}
      onClick={nextOnClick}
    >
      Next
    </Button>
  </Box>
)
