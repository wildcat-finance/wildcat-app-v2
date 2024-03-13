import {
  Box,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material"
import type { Meta } from "@storybook/react"

export default {
  title: "Components/Textfield",
  component: TextField,
} as Meta<typeof TextField>

const MOCK = [
  {
    value: "Item 1",
    id: "1",
  },
  {
    value: "Item 2",
    id: "2",
  },
  {
    value: "Item 3",
    id: "3",
  },
]

export const Text = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "15px",
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
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <TextField select label="Placeholder" sx={{ width: "245px" }}>
        {MOCK.map((item) => (
          <MenuItem key={item.id} value={item.value}>
            {item.value}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  </Box>
)
