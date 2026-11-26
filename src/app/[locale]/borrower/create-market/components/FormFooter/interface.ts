export type FormFooterProps = {
  backOnClick: () => void
  nextOnClick: () => void
  disableNext: boolean
  /* Shown beside Next, e.g. a button to view what the step chose */
  secondaryAction?: React.ReactNode
}
