import { SmallFilterSelectItem } from "./types"

export const getNameById = (
  id: string,
  options: SmallFilterSelectItem[],
): string => options.find((opt) => opt.id === id)?.name ?? id

export const isAllChildrenSelected = (
  selected: SmallFilterSelectItem[],
  childrenIds: string[],
) => childrenIds.every((id) => selected.some((item) => item.id === id))

export const toggleParentChildItems = (
  event: React.ChangeEvent<HTMLInputElement>,
  changedItem: SmallFilterSelectItem,
  selectedList: SmallFilterSelectItem[],
  setSelectedList: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >,
  childrenIds: string[],
  parentId: string,
  options: SmallFilterSelectItem[],
) => {
  const isChild = childrenIds.includes(changedItem.id)
  const isParent = changedItem.id === parentId

  if (isParent) {
    if (event.target.checked) {
      setSelectedList([
        { id: parentId, name: changedItem.name },
        ...childrenIds.map((id) => ({
          id,
          name: getNameById(id, options),
        })),
      ])
    } else {
      setSelectedList((prev) =>
        prev.filter(
          (item) => item.id !== parentId && !childrenIds.includes(item.id),
        ),
      )
    }
  } else if (isChild) {
    let updatedList = event.target.checked
      ? [...selectedList, changedItem]
      : selectedList.filter((el) => el.id !== changedItem.id)

    const allSelected = isAllChildrenSelected(updatedList, childrenIds)
    if (event.target.checked && allSelected) {
      updatedList = [
        ...updatedList,
        { id: parentId, name: getNameById(parentId, options) },
      ]
    } else {
      updatedList = updatedList.filter((el) => el.id !== parentId)
    }

    setSelectedList(updatedList)
  } else if (event.target.checked) {
    setSelectedList((prev) => [...prev, changedItem])
  } else {
    setSelectedList((prev) => prev.filter((el) => el.id !== changedItem.id))
  }
}
