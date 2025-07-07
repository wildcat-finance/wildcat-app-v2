import { useEffect, useState } from "react"

import { MDXRemote, MDXRemoteProps } from "next-mdx-remote"
import { serialize } from "next-mdx-remote/serialize"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import "./Markdown.css"

export function Markdown({ markdown }: { markdown: string }) {
  const [compiledMdx, setCompiledMdx] = useState<MDXRemoteProps | null>(null)
  useEffect(() => {
    if (markdown) {
      serialize(markdown, {
        scope: {},
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSanitize],
        },
      }).then((compiled) => {
        setCompiledMdx(compiled)
      })
    }
  }, [markdown])
  if (!compiledMdx) return null

  return (
    <div className="prose-rendered max-w-full font-sans">
      <MDXRemote {...compiledMdx} />
    </div>
  )
}
