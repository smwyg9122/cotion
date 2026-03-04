import React, { useEffect } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import { api } from '../../services/api';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Mention from '@tiptap/extension-mention';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
});
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { MentionList } from './MentionList';
import { DatePickerPopup } from './DatePickerPopup';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Users,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  Minus,
  ListChecks,
  Plus,
  Trash2,
  CalendarDays,
  Table2,
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  pageId: string;
  userId: string;
  userName: string;
}

export function TiptapEditor({ content, onChange, onSave, pageId, userId, userName }: TiptapEditorProps) {
  const [doc, setDoc] = React.useState<Y.Doc | null>(null);
  const [provider, setProvider] = React.useState<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<number>(0);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  useEffect(() => {
    const newDoc = new Y.Doc();
    setDoc(newDoc);

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

    const wsProvider = new WebsocketProvider(
      WS_URL,
      `page-${pageId}`,
      newDoc,
      {
        params: {
          doc: `page-${pageId}`,
          userId,
          userName: encodeURIComponent(userName),
        },
      }
    );

    wsProvider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    wsProvider.awareness.setLocalStateField('user', {
      name: userName,
      color: generateUserColor(userId),
    });

    wsProvider.awareness.on('change', () => {
      setActiveUsers(wsProvider.awareness.getStates().size);
    });

    setProvider(wsProvider);

    return () => {
      wsProvider.disconnect();
      newDoc.destroy();
    };
  }, [pageId, userId, userName]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        history: false,
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-2',
        },
      }),
      CustomTable.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      (Mention as any).configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          items: async ({ query }: { query: string }) => {
            try {
              const res = await api.get('/auth/users');
              const users = res.data.data;
              return users
                .filter((u: any) =>
                  u.name.toLowerCase().includes(query.toLowerCase()) ||
                  u.username.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 5);
            } catch {
              return [];
            }
          },
          command: ({ editor, range, props }: any) => {
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                { type: 'mention', attrs: { id: props.id, label: props.label } },
                { type: 'text', text: ' ' },
              ])
              .run();

            // Fire notification
            api.post('/notifications/mention', {
              mentionedUserId: props.id,
              pageId,
            }).catch(() => {});
          },
          render: () => {
            let component: ReactRenderer;
            let popup: TippyInstance[];

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });
                if (!props.clientRect) return;
                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate: (props: any) => {
                component?.updateProps(props);
                if (props.clientRect) {
                  popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
                }
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }
                return (component?.ref as any)?.onKeyDown(props);
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
      ...(doc ? [Collaboration.configure({
        document: doc,
      })] : []),
      ...(provider ? [CollaborationCursor.configure({
        provider: provider,
        user: {
          name: userName,
          color: generateUserColor(userId),
        },
      })] : []),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none',
      },
      handleClick: (view, pos) => {
        const { state } = view;
        const $pos = state.doc.resolve(pos);
        // Check if we're inside a table cell
        for (let d = $pos.depth; d > 0; d--) {
          const node = $pos.node(d);
          if (node.type.name === 'tableCell') {
            const cellText = node.textContent.trim();
            if (cellText === '☐' || cellText === '☑') {
              const newChar = cellText === '☐' ? '☑' : '☐';
              const cellStart = $pos.start(d);
              const tr = state.tr.replaceWith(
                cellStart,
                cellStart + node.content.size,
                state.schema.nodes.paragraph.create(
                  null,
                  state.schema.text(newChar)
                )
              );
              view.dispatch(tr);
              return true;
            }
            break;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  }, [doc, provider]);

  // Initialize content from DB when editor is empty and content prop arrives
  useEffect(() => {
    if (
      editor &&
      editor.isEmpty &&
      content &&
      content.trim().length > 0 &&
      content !== '<p></p>' &&
      content !== '<p><br></p>'
    ) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  useEffect(() => {
    if (!editor || !provider) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, provider, onSave]);

  function handleLinkAdd() {
    const previousUrl = editor?.getAttributes('link').href;
    const url = prompt('링크 URL을 입력하세요:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function handleImageUpload() {
    imageInputRef.current?.click();
  }

  function handleFileUpload() {
    fileInputRef.current?.click();
  }

  function handleDateSelect(dateStr: string) {
    editor?.chain().focus().insertContent(dateStr).run();
    setIsDatePickerOpen(false);
  }

  function isChecklistTable(): boolean {
    if (!editor) return false;
    const { state } = editor;
    const { $from } = state.selection;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'table') {
        return node.attrs.class === 'checklist-table';
      }
    }
    return false;
  }

  function handleAddRow() {
    if (!editor) return;
    const checklist = isChecklistTable();
    (editor.chain().focus() as any).addRowAfter().run();

    if (checklist) {
      // After addRowAfter, cursor is in the new row. Find the first cell and insert ☐
      requestAnimationFrame(() => {
        const { state } = editor;
        const { $from } = state.selection;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'tableRow') {
            const row = $from.node(d);
            const firstCell = row.firstChild;
            if (firstCell && !firstCell.textContent.trim()) {
              const rowStart = $from.start(d);
              const tr = state.tr.replaceWith(
                rowStart,
                rowStart + firstCell.content.size,
                state.schema.nodes.paragraph.create(null, state.schema.text('☐'))
              );
              editor.view.dispatch(tr);
            }
            break;
          }
        }
      });
    }
  }

  function insertChecklist() {
    const row = (check: string) => ({
      type: 'tableRow',
      content: [
        { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: check }] }] },
        { type: 'tableCell', content: [{ type: 'paragraph' }] },
        { type: 'tableCell', content: [{ type: 'paragraph' }] },
        { type: 'tableCell', content: [{ type: 'paragraph' }] },
      ],
    });

    editor?.chain().focus().insertContent({
      type: 'table',
      attrs: { class: 'checklist-table' },
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '체크' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '할 일' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '담당자' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '기한' }] }] },
          ],
        },
        row('☐'),
        row('☐'),
        row('☐'),
      ],
    }).run();
  }

  function insertPlainTable() {
    const cell = () => ({ type: 'tableCell', content: [{ type: 'paragraph' }] });
    const header = (text: string) => ({ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

    editor?.chain().focus().insertContent({
      type: 'table',
      content: [
        { type: 'tableRow', content: [header('제목 1'), header('제목 2'), header('제목 3')] },
        { type: 'tableRow', content: [cell(), cell(), cell()] },
        { type: 'tableRow', content: [cell(), cell(), cell()] },
      ],
    }).run();
  }

  async function onImageFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지는 5MB 이하만 업로드 가능합니다');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': undefined },
      });
      const { url } = res.data.data;
      editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch {
      alert('이미지 업로드에 실패했습니다');
    }
    e.target.value = '';
  }

  async function onPdfFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('파일은 10MB 이하만 업로드 가능합니다');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': undefined },
      });
      const { url, originalName } = res.data.data;
      editor?.chain().focus().insertContent(
        `<a href="${url}" target="_blank" download="${originalName}">📄 ${originalName}</a>`
      ).run();
    } catch {
      alert('파일 업로드에 실패했습니다');
    }
    e.target.value = '';
  }

  if (!editor) {
    return <div className="p-4 text-gray-500">에디터 로딩 중...</div>;
  }

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-2 sm:px-4 py-1.5 sm:py-2 flex flex-nowrap overflow-x-auto scrollbar-hide gap-0.5 sm:gap-1 items-center shadow-sm">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5 mr-2 px-2 py-1.5 bg-gray-50 rounded-md text-xs text-gray-600 font-medium flex-shrink-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <Users size={13} />
          <span className="hidden sm:inline">{activeUsers}명</span>
        </div>

        <div className="w-px h-5 bg-gray-300 mx-0.5 flex-shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={<Bold size={18} />}
          title="굵게 (Cmd+B)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={<Italic size={18} />}
          title="기울임 (Cmd+I)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          icon={<Strikethrough size={18} />}
          title="취소선"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          icon={<Code size={18} />}
          title="인라인 코드"
        />

        <div className="w-px h-5 bg-gray-300 mx-0.5 flex-shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          icon={<Heading1 size={18} />}
          title="제목 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon={<Heading2 size={18} />}
          title="제목 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          icon={<Heading3 size={18} />}
          title="제목 3"
        />

        <div className="w-px h-5 bg-gray-300 mx-0.5 flex-shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={<List size={18} />}
          title="글머리 목록"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={<ListOrdered size={18} />}
          title="번호 목록"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          icon={<Quote size={18} />}
          title="인용구"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={<Minus size={18} />}
          title="구분선"
        />

        <div className="w-px h-5 bg-gray-300 mx-0.5 flex-shrink-0" />

        <ToolbarButton
          onClick={handleLinkAdd}
          isActive={editor.isActive('link')}
          icon={<LinkIcon size={18} />}
          title="링크 추가"
        />
        <ToolbarButton
          onClick={handleImageUpload}
          icon={<ImageIcon size={18} />}
          title="이미지 업로드"
        />
        <ToolbarButton
          onClick={handleFileUpload}
          icon={<FileText size={18} />}
          title="파일 업로드"
        />

        <div className="w-px h-5 bg-gray-300 mx-0.5 flex-shrink-0" />

        <ToolbarButton
          onClick={insertChecklist}
          icon={<ListChecks size={18} />}
          title="체크리스트 표"
        />
        <ToolbarButton
          onClick={insertPlainTable}
          icon={<Table2 size={18} />}
          title="표 삽입"
        />

        {editor.isActive('table') && (
          <>
            <ToolbarButton
              onClick={handleAddRow}
              icon={<Plus size={18} />}
              title="행 추가"
            />
            <ToolbarButton
              onClick={() => (editor.chain().focus() as any).deleteRow().run()}
              icon={<Trash2 size={18} />}
              title="행 삭제"
            />
            <ToolbarButton
              onClick={() => setIsDatePickerOpen(true)}
              icon={<CalendarDays size={18} />}
              title="날짜 삽입"
            />
          </>
        )}
      </div>

      {isDatePickerOpen && (
        <DatePickerPopup
          onSelect={handleDateSelect}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}

      {/* Editor Content */}
      <div className="px-4 py-4 sm:px-16 sm:py-8 min-h-[calc(100vh-200px)] max-w-[900px] mx-auto">
        <EditorContent editor={editor} className="notion-editor" />
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageFileSelected}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf"
        className="hidden"
        onChange={onPdfFileSelected}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
}

function ToolbarButton({ onClick, isActive, disabled, icon, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 sm:p-2 rounded-md transition-all flex-shrink-0 ${
        isActive
          ? 'bg-blue-50 text-blue-600 shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {icon}
    </button>
  );
}

function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
