import { useMediaQuery } from "@mui/material"

import { theme } from "@/theme/theme"

export const useMobileResolution = () =>
  useMediaQuery(theme.breakpoints.down("md"))
