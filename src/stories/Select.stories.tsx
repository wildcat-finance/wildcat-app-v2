import { FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import type { Meta } from "@storybook/react"
import SvgIcon from "@mui/material/SvgIcon"
import { ExtendedSelect } from "@/components/extended/ExtendedSelect"
import Icon from "../assets/icons/downArrow_icon.svg"

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
  <ExtendedSelect label="Placeholder">
    {MOCK.map((item) => (
      <MenuItem key={item.id} value={item.value}>
        {item.value}
      </MenuItem>
    ))}
  </ExtendedSelect>
)
