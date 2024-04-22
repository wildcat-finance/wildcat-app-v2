import { Box, MenuItem, Typography } from "@mui/material"
import type { Meta } from "@storybook/react"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"

export default {
  title: "Components/Select",
  component: ExtendedSelect,
} as Meta<typeof ExtendedSelect>

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

export const ThemedSelect = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      rowGap: "30px",
    }}
  >
    <ExtendedSelect label="Placeholder">
      {MOCK.map((item) => (
        <MenuItem key={item.id} value={item.value}>
          {item.value}
        </MenuItem>
      ))}
    </ExtendedSelect>

    <ExtendedSelect small label="Placeholder">
      {MOCK.map((item) => (
        <MenuItem key={item.id} value={item.value}>
          <Typography variant="text4">{item.value}</Typography>
        </MenuItem>
      ))}
    </ExtendedSelect>
  </Box>
)
