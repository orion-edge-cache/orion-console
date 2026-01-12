/**
 * ResponseHeaders Component
 *
 * Collapsible response headers display.
 */

import { Text } from '@tremor/react';

interface ResponseHeadersProps {
  headers: Record<string, string>;
}

export function ResponseHeaders({ headers }: ResponseHeadersProps) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
      <details className="group">
        <summary
          className="px-4 py-2 cursor-pointer flex items-center justify-between transition-colors"
          style={{ background: 'var(--color-bg-tertiary)' }}
        >
          <Text className="text-sm font-medium">
            Response Headers ({Object.keys(headers).length})
          </Text>
          <span className="text-xs group-open:rotate-180 transition-transform text-slate-400">
            ▼
          </span>
        </summary>
        <div
          className="p-4 max-h-40 overflow-auto border-t"
          style={{
            background: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border-subtle)',
          }}
        >
          <table className="w-full text-xs font-mono">
            <tbody>
              {Object.entries(headers).map(([key, value]) => (
                <tr
                  key={key}
                  className="border-b last:border-0"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  <td className="py-1 pr-4 font-medium text-slate-500">{key}</td>
                  <td className="py-1 break-all text-slate-700">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
