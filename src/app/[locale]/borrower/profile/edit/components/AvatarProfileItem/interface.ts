import * as React from "react"

export type AvatarProfileItemProps = {
  avatar: string | undefined
  setAvatar: React.Dispatch<React.SetStateAction<string | undefined>>
  isLoading: boolean
}
