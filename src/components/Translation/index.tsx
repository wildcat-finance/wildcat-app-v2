import { ComponentProps } from "react"

// eslint-disable-next-line no-restricted-imports -- this is the protected boundary
import { Trans as ReactI18nextTrans } from "react-i18next"

type TranslationProps = ComponentProps<typeof ReactI18nextTrans>

const escapeTagSyntax = (value: unknown) =>
  String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;")

/**
 * react-i18next parses the translated Trans string as markup after interpolation.
 * Escape tag delimiters before that parse, then decode them only after the AST is
 * built so React receives the original value as a text node.
 */
export const Trans = ({ tOptions, ...props }: TranslationProps) => (
  <ReactI18nextTrans
    {...props}
    shouldUnescape
    tOptions={{
      ...tOptions,
      interpolation: {
        ...tOptions?.interpolation,
        escapeValue: true,
        escape: escapeTagSyntax,
      },
    }}
  />
)
