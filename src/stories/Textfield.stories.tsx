import { Box, InputAdornment, TextField, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import type { Meta } from "@storybook/react"

import Icon from "@/assets/icons/search_icon.svg"
import { COLORS } from "@/theme/colors"

export default {
  title: "Components/Textfield",
  component: TextField,
} as Meta<typeof TextField>

export const Text = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      rowGap: "30px",
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <TextField
        label="Placeholder"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Typography variant="text3">ETH</Typography>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="Placeholder"
        value="Text"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Typography variant="text3">ETH</Typography>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="Placeholder"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Typography variant="text3">ETH</Typography>
            </InputAdornment>
          ),
        }}
        disabled
      />

      <TextField
        error
        label="Placeholder"
        helperText="Error Text"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Typography variant="text3">ETH</Typography>
            </InputAdornment>
          ),
        }}
      />
    </Box>

    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <TextField size="medium" label="Placeholder" />

      <TextField size="medium" label="Placeholder" value="Text" />

      <TextField size="medium" label="Placeholder" disabled />

      <TextField
        size="medium"
        error
        label="Placeholder"
        helperText="Error Text"
      />
    </Box>

    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <TextField
        size="small"
        label="Placeholder"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SvgIcon
                fontSize="small"
                sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
              >
                <Icon />
              </SvgIcon>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        size="small"
        label="Placeholder"
        value="Text"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SvgIcon
                fontSize="small"
                sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
              >
                <Icon />
              </SvgIcon>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        size="small"
        label="Placeholder"
        disabled
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SvgIcon
                fontSize="small"
                sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
              >
                <Icon />
              </SvgIcon>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  </Box>
)
