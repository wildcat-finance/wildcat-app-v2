import * as React from "react"
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  Box,
  InputAdornment,
  MenuItem,
  Select,
  SelectChangeEvent,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { useRouter } from "next/navigation"

import { SmallFilterSelectItem } from "../../../../../../components/SmallFilterSelect"
import {
  MarketSelectMenuItemStyles,
  MarketSelectMenuStyles,
  MarketSelectStyles,
  SearchStyles,
} from "@/app/[locale]/borrower/edit-lenders-list/components/MarketSelect/style"
import Icon from "@/assets/icons/search_icon.svg"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import { resetPolicyLendersState } from "@/store/slices/policyLendersSlice/policyLendersSlice"
import { COLORS } from "@/theme/colors"

export type PolicySelectProps = {
  policies: SmallFilterSelectItem[]
  selected: SmallFilterSelectItem
  setSelected: Dispatch<SetStateAction<SmallFilterSelectItem>>
}

export const PolicySelect = ({
  policies,
  selected,
  setSelected,
}: PolicySelectProps) => {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const [policyName, setPolicyName] = useState("")

  const policyLink = (policy: string) =>
    `${ROUTES.borrower.policy}?policy=${encodeURIComponent(policy)}`

  const filteredPoliciesByName = policies.filter((policy) =>
    policy.name.toLowerCase().includes(policyName.toLowerCase()),
  )

  const handleChangePolicyName = (evt: ChangeEvent<HTMLInputElement>) => {
    setPolicyName(evt.target.value)
  }

  const handleChangePolicy = (event: SelectChangeEvent) => {
    const selectedValue = event.target.value

    const selectedPolicy = policies.find(
      (policy) => policy.name === selectedValue,
    )
    if (selectedPolicy) {
      setSelected(selectedPolicy)
    }

    router.push(policyLink(selected.id))
    setPolicyName("")
    dispatch(resetPolicyLendersState())
  }

  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }

    setPolicyName("")
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.remove("Mui-focused")
    }
  }

  useEffect(() => {
    if (selected?.id) {
      router.push(policyLink(selected.id))
    }
  }, [selected])

  return (
    <Select
      ref={selectRef}
      value={selected.name}
      onOpen={onOpen}
      onClose={onClose}
      onChange={handleChangePolicy}
      displayEmpty
      renderValue={() => (
        <Typography variant="text3" color={COLORS.white}>
          {selected.name}
        </Typography>
      )}
      sx={{
        ...MarketSelectStyles,
        "& .MuiTypography-root": {
          color: COLORS.ultramarineBlue,
        },
      }}
      MenuProps={{
        sx: MarketSelectMenuStyles,
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "left",
        },
        transformOrigin: {
          vertical: "top",
          horizontal: "left",
        },
      }}
    >
      <Box>
        <TextField
          onChange={handleChangePolicyName}
          onKeyDown={(e) => e.stopPropagation()}
          fullWidth
          size="small"
          placeholder="Search by Name"
          sx={SearchStyles}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SvgIcon
                  fontSize="small"
                  sx={{
                    width: "20px",
                    "& path": { fill: `${COLORS.white03}` },
                  }}
                >
                  <Icon />
                </SvgIcon>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {filteredPoliciesByName.map((policy) => (
        <MenuItem
          key={policy.id}
          value={policy.name}
          sx={MarketSelectMenuItemStyles}
        >
          <Typography variant="text3" color={COLORS.white}>
            {policy.name}
          </Typography>
        </MenuItem>
      ))}
    </Select>
  )
}
