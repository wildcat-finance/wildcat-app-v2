import * as React from "react"
import { styled } from "@mui/material/styles"
import { RadioProps } from "@mui/material/Radio"
import { Radio as MUIRadio } from "@mui/material"

import { COLORS } from "@/theme/colors"

const Icon = styled("span")({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: "50%",
  width: 15,
  height: 15,
})

const CheckedIcon = styled(Icon)({
  "&::before": {
    display: "block",
    width: 11,
    height: 11,
    backgroundColor: COLORS.blackRock,
    borderRadius: "50%",
    content: '""',
  },
})

export default function Radio(props: RadioProps) {
  return <MUIRadio checkedIcon={<CheckedIcon />} icon={<Icon />} {...props} />
}
