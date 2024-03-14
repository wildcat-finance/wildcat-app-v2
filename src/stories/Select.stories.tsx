import { FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import type { Meta } from "@storybook/react"
// import Icon from "../assets/icons/downArrow_icon.svg"

export default {
  title: "Components/Select",
  component: Select,
} as Meta<typeof Select>

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
  <FormControl fullWidth>
    <InputLabel id="demo-simple-select-label">Placeholder</InputLabel>
    <Select
      label="Placeholder"
      labelId="demo-simple-select-label"
      id="demo-simple-select"
      sx={{ width: "260px" }}
      // IconComponent={() => <Icon />}
    >
      {MOCK.map((item) => (
        <MenuItem key={item.id} value={item.value}>
          {item.value}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
)
