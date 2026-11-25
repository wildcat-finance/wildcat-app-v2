/* eslint-disable import/no-extraneous-dependencies */
import { render } from "@testing-library/react"

import { MLA_DOCUMENT_SANDBOX, MlaDocument, openLinksInNewTab } from "."

describe("openLinksInNewTab", () => {
  it("opens links to other pages in a new tab", () => {
    expect(
      openLinksInNewTab(
        '<p>See <a class="c48"\n href="https://docs.wildcat.finance">the docs</a>.</p>',
      ),
    ).toBe(
      '<p>See <a class="c48"\n href="https://docs.wildcat.finance" target="_blank" rel="noopener noreferrer">the docs</a>.</p>',
    )
    expect(openLinksInNewTab("<a href='mailto:legal@x.y'>x</a>")).toBe(
      '<a href=\'mailto:legal@x.y\' target="_blank" rel="noopener noreferrer">x</a>',
    )
  })

  it("replaces a target that would keep the link in the frame", () => {
    expect(
      openLinksInNewTab('<a target="_self" rel="x" href="http://a.b">a</a>'),
    ).toBe(
      '<a href="http://a.b" target="_blank" rel="noopener noreferrer">a</a>',
    )
  })

  it("leaves links within the agreement and other tags alone", () => {
    const html = '<a href="#clause-2">Clause 2</a><abbr title="x">MLA</abbr>'
    expect(openLinksInNewTab(html)).toBe(html)
  })
})

it("frames the agreement with links that open new tabs and no scripts", () => {
  const { container } = render(
    <MlaDocument html='<a href="https://a.b">a</a>' title="MLA" />,
  )
  const frame = container.querySelector("iframe") as HTMLIFrameElement
  expect(frame.getAttribute("sandbox")).toBe(MLA_DOCUMENT_SANDBOX)
  expect(MLA_DOCUMENT_SANDBOX).not.toMatch(/allow-scripts|allow-same-origin/)
  expect(frame.getAttribute("srcdoc")).toBe(
    '<a href="https://a.b" target="_blank" rel="noopener noreferrer">a</a>',
  )
})
