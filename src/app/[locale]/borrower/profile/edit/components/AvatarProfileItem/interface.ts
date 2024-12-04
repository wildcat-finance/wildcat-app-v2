import * as React from "react"

export type AvatarProfileItemProps = {
  avatar: string | null
  setAvatar: React.Dispatch<React.SetStateAction<string | null>>
  isLoading: boolean
}
