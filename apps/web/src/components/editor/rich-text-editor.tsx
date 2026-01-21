import { useEditor, EditorContent } from '@tiptap/react'
import { useMemo, useEffect } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Mention from '@tiptap/extension-mention'
import { getSuggestionOptions } from './suggestion'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
  minHeight?: string
  onFetchUsers?: (query: string) => Promise<any[]>
  onBlur?: () => void
}

export function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Write something...',
  readOnly = false,
  className,
  minHeight = '150px',
  onFetchUsers,
  onBlur,
}: RichTextEditorProps) {
  const extensions = useMemo(() => {
    const list: any[] = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4 cursor-pointer',
        },
      }),
    ]

    if (onFetchUsers) {
      list.push(
        Mention.configure({
          HTMLAttributes: {
            class:
              'bg-primary/10 text-primary font-medium px-1 py-0.5 rounded-sm box-decoration-clone',
          },
          renderHTML: ({ options, node }) => {
            return [
              'span',
              options.HTMLAttributes,
              `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`,
            ]
          },
          suggestion: getSuggestionOptions(onFetchUsers),
        }),
      )
    } else {
      // Read-only support for displaying mentions
      list.push(
        Mention.configure({
          HTMLAttributes: {
            class:
              'bg-primary/10 text-primary font-medium px-1 py-0.5 rounded-sm box-decoration-clone',
          },
          renderHTML: ({ options, node }) => {
            return [
              'span',
              options.HTMLAttributes,
              `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`,
            ]
          },
        })
      )
    }

    return list
  }, [placeholder, onFetchUsers])

  const editor = useEditor({
    extensions,
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    onBlur: () => {
      onBlur?.()
    },
  })

  // Sync content updates (e.g. when clearing the form)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  if (readOnly) {
    return (
      <div
        className={cn(
          'prose dark:prose-invert max-w-none prose-sm',
          '[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_blockquote]:my-2',
          className,
        )}
      >
        <EditorContent editor={editor} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className,
      )}
    >
      {/* Toolbar */}
      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Bold (Ctrl+B)"
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Italic (Ctrl+I)"
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            tooltip="Strikethrough"
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            tooltip="Inline code"
          >
            <Code className="size-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            tooltip="Bullet list"
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            tooltip="Numbered list"
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            tooltip="Quote"
          >
            <Quote className="size-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            onClick={addLink}
            isActive={editor.isActive('link')}
            tooltip="Add link"
          >
            <LinkIcon className="size-4" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="Undo"
          >
            <Undo className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="Redo"
          >
            <Redo className="size-4" />
          </ToolbarButton>
        </div>
      </TooltipProvider>

      {/* Editor Content */}
      <div
        className={cn(
          'prose dark:prose-invert max-w-none prose-sm px-3 py-2',
          '[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_blockquote]:my-2',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
        )}
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  tooltip: string
  children: React.ReactNode
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0',
            isActive && 'bg-accent text-accent-foreground',
          )}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}
