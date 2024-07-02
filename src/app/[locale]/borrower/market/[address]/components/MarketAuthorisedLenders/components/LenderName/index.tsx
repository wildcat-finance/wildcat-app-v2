import { ChangeEvent, useEffect, useRef, useState } from "react"

import {
  Box,
  IconButton,
  InputAdornment,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import EditIcon from "@/assets/icons/edit_icon.svg"
import { COLORS } from "@/theme/colors"

import { LenderNameProps } from "./interface"
import {
  LenderNameContainer,
  LenderNameIcon,
  LenderNameTextfield,
} from "./style"

export const LenderName = ({ address }: LenderNameProps) => {
  const [isEdit, setIsEdit] = useState(false)
  const [name, setName] = useState("Add Name")
  const [prevName, setPrevName] = useState(name)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPlaceholder = name === "Add Name"

  const handleClickEdit = () => {
    setPrevName(name)
    setIsEdit(true)
  }

  const handleSave = (evt: React.KeyboardEvent) => {
    if (evt.key === "Enter") {
      setName(name.trim())
      setPrevName(name)
      setIsEdit(false)
    }
  }

  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === " ") {
      evt.stopPropagation()
    }
  }

  const handleClickEraseName = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    setName("")
  }

  const handleChangeName = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setName(value)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (isEdit) {
          setName(prevName)
        }
        setIsEdit(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isEdit, prevName])

  return (
    <Box sx={LenderNameContainer}>
      {!isEdit && (
        <Typography
          variant="text3"
          sx={{ color: isPlaceholder ? COLORS.santasGrey : COLORS.blackRock }}
        >
          {name}
        </Typography>
      )}

      {isEdit && (
        <TextField
          ref={containerRef}
          value={name}
          size="small"
          autoFocus
          onChange={handleChangeName}
          onKeyUp={handleSave}
          onKeyDown={handleKeyDown}
          sx={LenderNameTextfield}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClickEraseName}
                  disableRipple
                  sx={LenderNameIcon}
                >
                  <SvgIcon fontSize="small">
                    <Cross />
                  </SvgIcon>
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      )}

      {!isEdit && (
        <IconButton onClick={handleClickEdit} disableRipple sx={LenderNameIcon}>
          <SvgIcon fontSize="medium">
            <EditIcon />
          </SvgIcon>
        </IconButton>
      )}
    </Box>
  )
}
