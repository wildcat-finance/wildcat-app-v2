export const LETTER_NUMBER_SPACE_REGX = /^[a-zA-Z0-9 ]*$/
export const isLetterNumberSpace = {
  validate: (value: string) => LETTER_NUMBER_SPACE_REGX.test(value),
  message: "Should contain only letters, numbers and spaces",
}

export const LETTER_NUMBER_REGX = /^[a-zA-Z0-9]*$/
export const isLetterNumber = {
  validate: (value: string) => LETTER_NUMBER_REGX.test(value),
  message: "Should contain only letters and numbers",
}
