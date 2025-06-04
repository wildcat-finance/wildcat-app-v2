import React from "react"

import { FormControl, FormControlLabel } from "@mui/material"

import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"

import {
  parentAssetId,
  parentStatusId,
  SmallFilterSelectItem,
  subAssetIds,
  subStatusIds,
} from "../types"
import { toggleParentChildItems } from "../useToggleParentChild"

type FilterBodyProps = {
  assetsOptions: SmallFilterSelectItem[]
  selectedAssets: SmallFilterSelectItem[]
  setSelectedAssets: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >

  statusesOptions: SmallFilterSelectItem[]
  selectedStatuses: SmallFilterSelectItem[]
  setSelectedStatuses: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >
}

const CheckboxGroup = ({
  options,
  selectedItems,
  setSelectedItems,
  childrenIds,
  parentId,
}: {
  options: SmallFilterSelectItem[]
  selectedItems: SmallFilterSelectItem[]
  setSelectedItems: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >
  childrenIds: string[]
  parentId: string
}) => (
  <FormControl
    component="fieldset"
    sx={{ display: "flex", flexDirection: "column", gap: "6px" }}
  >
    {options.map((item, index) => (
      <FormControlLabel
        key={item.id}
        control={
          <ExtendedCheckbox
            checked={selectedItems.some((selected) => selected.id === item.id)}
            onChange={(e) =>
              toggleParentChildItems(
                e,
                item,
                selectedItems,
                setSelectedItems,
                childrenIds,
                parentId,
                options,
              )
            }
          />
        }
        label={item.name}
        sx={{
          pl: index === 0 ? "0px" : "16px",
          "& ::before": {
            transform: "translate(-3px, -3px) scale(0.75)",
          },
        }}
      />
    ))}
  </FormControl>
)

export const Filters = ({
  assetsOptions,
  selectedAssets,
  setSelectedAssets,
  statusesOptions,
  selectedStatuses,
  setSelectedStatuses,
}: FilterBodyProps) => (
  <div>
    <CheckboxGroup
      options={assetsOptions}
      selectedItems={selectedAssets}
      setSelectedItems={setSelectedAssets}
      childrenIds={subAssetIds}
      parentId={parentAssetId}
    />
    <CheckboxGroup
      options={statusesOptions}
      selectedItems={selectedStatuses}
      setSelectedItems={setSelectedStatuses}
      childrenIds={subStatusIds}
      parentId={parentStatusId}
    />
  </div>
)
