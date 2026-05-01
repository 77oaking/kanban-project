'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

export function RichTextEditor({ value, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || 'Start writing…' }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: { attributes: { class: 'prose-announcement' } },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g., resetting after submit)
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="input min-h-[120px] flex items-center text-sm text-zinc-400">Loading…</div>;
  }

  return (
    <div className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 px-2 py-1">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><i>I</i></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><s>S</s></ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>•</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1.</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>"</ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('URL');
            if (!url) return;
            editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive('link')}
        >
          link
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({ active, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`h-7 min-w-7 px-2 rounded text-xs font-medium ${
        active ? 'bg-fredo-50 text-fredo-800 dark:bg-fredo-950/40 dark:text-fredo-300' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    />
  );
}
