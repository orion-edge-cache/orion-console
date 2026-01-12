/**
 * QueryEditor Component
 *
 * Split panel with GraphQL query and variables editors.
 */

import { useRef } from 'react';
import { Text } from '@tremor/react';

interface QueryEditorProps {
  query: string;
  onQueryChange: (query: string) => void;
  variables: string;
  onVariablesChange: (variables: string) => void;
}

export function QueryEditor({
  query,
  onQueryChange,
  variables,
  onVariablesChange,
}: QueryEditorProps) {
  const queryRef = useRef<HTMLTextAreaElement>(null);
  const variablesRef = useRef<HTMLTextAreaElement>(null);

  const handleTabKeydown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    value: string,
    onChange: (v: string) => void,
    ref: React.RefObject<HTMLTextAreaElement | null>
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = ref.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '  ';
      const newValue = value.substring(0, start) + spaces + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      });
    }
  };

  return (
    <div
      className="w-1/2 flex flex-col border-r"
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      {/* Query Editor */}
      <div className="flex-1 flex flex-col">
        <div
          className="px-4 py-2 border-b"
          style={{
            background: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border-subtle)',
          }}
        >
          <Text className="text-sm font-medium">Query</Text>
        </div>
        <textarea
          ref={queryRef}
          className="flex-1 w-full p-4 text-sm focus:outline-none resize-none font-mono"
          style={{
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
          }}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => handleTabKeydown(e, query, onQueryChange, queryRef)}
          placeholder="Enter your GraphQL query..."
          spellCheck={false}
        />
      </div>

      {/* Variables Editor */}
      <div
        className="h-32 border-t"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div
          className="px-4 py-2 border-b"
          style={{
            background: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border-subtle)',
          }}
        >
          <Text className="text-sm font-medium">Variables</Text>
        </div>
        <textarea
          ref={variablesRef}
          className="w-full h-20 p-4 text-sm focus:outline-none resize-none font-mono"
          style={{
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
          }}
          value={variables}
          onChange={(e) => onVariablesChange(e.target.value)}
          onKeyDown={(e) => handleTabKeydown(e, variables, onVariablesChange, variablesRef)}
          placeholder="{}"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
