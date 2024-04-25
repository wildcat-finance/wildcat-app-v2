type Link = {
  isExternal: boolean
  url: string
}

export type BannerProps = {
  title: string | undefined
  text: string | undefined
  buttonText: string | undefined
  buttonLink: Link | undefined
}
