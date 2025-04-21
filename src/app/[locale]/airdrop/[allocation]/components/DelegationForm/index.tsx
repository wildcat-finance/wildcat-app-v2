import { useState } from "react"

import { Box, FormControlLabel, RadioGroup, Typography } from "@mui/material"

import ExtendedRadio from "@/components/@extended/ExtendedRadio"
import { COLORS } from "@/theme/colors"

export const DelegationForm = () => {
  const [delegation, setDelegation] = useState<"self" | "another">("self")

  const handleChangeDelegation = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDelegation(event.target.value as "self" | "another")
  }

  return (
    <Box>
      <Typography variant="text3" sx={{ marginLeft: "12px" }}>
        Choose below to whom you want to delegate your vote?
      </Typography>

      <RadioGroup
        aria-labelledby="deligation-form"
        name="delegation"
        value={delegation}
        onChange={handleChangeDelegation}
        sx={{
          marginTop: "20px",
          flexDirection: "row",
          flexWrap: { xs: "wrap", sm: "nowrap" },
          gap: "6px",
        }}
      >
        <FormControlLabel
          label="Self"
          control={
            <ExtendedRadio value="self" onChange={handleChangeDelegation} />
          }
          sx={{
            width: "100%",
            height: "44px",
            border: `1px solid ${COLORS.whiteLilac}`,
            borderRadius: "8px",
            padding: "0 15px",
            display: "flex",
            alignItems: "center",
          }}
        />

        <FormControlLabel
          label="Another Address"
          control={
            <ExtendedRadio value="another" onChange={handleChangeDelegation} />
          }
          sx={{
            width: "100%",
            height: "44px",
            border: `1px solid ${COLORS.whiteLilac}`,
            borderRadius: "8px",
            padding: "0 15px",
            display: "flex",
            alignItems: "center",
          }}
        />
      </RadioGroup>
    </Box>
  )
}
