type Link = {
  isExternal: boolean
  url: string
}

export type BannerProps = {
  title?: string
  text?: string
  buttonText?: string
  buttonLink?: Link
  onClick?: () => void
}
