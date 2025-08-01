"use client"

// InitializedMDXEditor.tsx
import type { ForwardedRef } from "react"

import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkDialogPlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertImage,
  InsertTable,
  tablePlugin,
  imagePlugin,
  ListsToggle,
  BlockTypeSelect,
  type MDXEditorMethods,
  type MDXEditorProps,
  linkPlugin,
} from "@mdxeditor/editor"

const ToolbarContents = () => (
  <>
    {" "}
    <UndoRedo />
    <BoldItalicUnderlineToggles />
    <ListsToggle />
    <InsertTable />
    <InsertImage />
    <CreateLink />
    <BlockTypeSelect />
  </>
)

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return (
    <MDXEditor
      className="full-demo-mdxeditor"
      contentEditableClassName="prose max-w-full font-sans"
      plugins={[
        // Example Plugin Usage
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        tablePlugin(),
        imagePlugin(),
        toolbarPlugin({
          toolbarClassName: "my-classname",
          toolbarContents: ToolbarContents,
        }),
      ]}
      {...props}
      ref={editorRef}
    />
  )
}
