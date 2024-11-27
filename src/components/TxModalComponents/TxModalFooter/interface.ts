export type TxModalFooterProps = {
  mainBtnText: string
  mainBtnOnClick: () => void
  disableMainBtn?: boolean

  secondBtnText?: string
  secondBtnOnClick?: () => void
  secondBtnLoading?: boolean
  disableSecondBtn?: boolean

  link?: string | null
  hideButtons?: boolean
  secondBtnIcon?: boolean
}
