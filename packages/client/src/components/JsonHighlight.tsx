/**
 * JSON Syntax Highlighter
 *
 * Renders JSON with colorized syntax for numbers, strings, booleans, nulls, and keys.
 */

import { memo } from 'react';

interface JsonHighlightProps {
  data: unknown;
  className?: string;
}

// Color tokens
const colors = {
  key: 'var(--color-accent)',           // Cyan for keys
  string: 'var(--color-success)',       // Green for strings
  number: '#f59e0b',                    // Amber for numbers
  boolean: '#a855f7',                   // Purple for booleans
  null: 'var(--color-text-muted)',      // Muted for null
  bracket: 'var(--color-text-secondary)', // Brackets/braces
  punctuation: 'var(--color-text-muted)', // Colons, commas
};

export const JsonHighlight = memo(function JsonHighlight({ data, className = '' }: JsonHighlightProps) {
  const renderValue = (value: unknown, indent: number = 0): JSX.Element => {
    const indentStr = '  '.repeat(indent);
    const nextIndentStr = '  '.repeat(indent + 1);

    if (value === null) {
      return <span style={{ color: colors.null }}>null</span>;
    }

    if (typeof value === 'boolean') {
      return <span style={{ color: colors.boolean }}>{value ? 'true' : 'false'}</span>;
    }

    if (typeof value === 'number') {
      return <span style={{ color: colors.number }}>{value}</span>;
    }

    if (typeof value === 'string') {
      // Escape special characters for display
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return <span style={{ color: colors.string }}>"{escaped}"</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <>
            <span style={{ color: colors.bracket }}>[</span>
            <span style={{ color: colors.bracket }}>]</span>
          </>
        );
      }

      return (
        <>
          <span style={{ color: colors.bracket }}>[</span>
          {'\n'}
          {value.map((item, index) => (
            <span key={index}>
              {nextIndentStr}
              {renderValue(item, indent + 1)}
              {index < value.length - 1 && <span style={{ color: colors.punctuation }}>,</span>}
              {'\n'}
            </span>
          ))}
          {indentStr}
          <span style={{ color: colors.bracket }}>]</span>
        </>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return (
          <>
            <span style={{ color: colors.bracket }}>{'{'}</span>
            <span style={{ color: colors.bracket }}>{'}'}</span>
          </>
        );
      }

      return (
        <>
          <span style={{ color: colors.bracket }}>{'{'}</span>
          {'\n'}
          {entries.map(([key, val], index) => (
            <span key={key}>
              {nextIndentStr}
              <span style={{ color: colors.key }}>"{key}"</span>
              <span style={{ color: colors.punctuation }}>: </span>
              {renderValue(val, indent + 1)}
              {index < entries.length - 1 && <span style={{ color: colors.punctuation }}>,</span>}
              {'\n'}
            </span>
          ))}
          {indentStr}
          <span style={{ color: colors.bracket }}>{'}'}</span>
        </>
      );
    }

    // Fallback for undefined or other types
    return <span style={{ color: colors.null }}>{String(value)}</span>;
  };

  return (
    <pre
      className={`text-sm whitespace-pre font-mono ${className}`}
      style={{ color: 'var(--color-text-primary)' }}
    >
      {renderValue(data)}
    </pre>
  );
});

export default JsonHighlight;
