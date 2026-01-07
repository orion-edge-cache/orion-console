interface TerminalOutputProps {
  logs: string[];
  isRunning?: boolean;
  runningText?: string;
  maxHeight?: string;
  className?: string;
}

export function TerminalOutput({
  logs,
  isRunning = false,
  runningText = 'Running...',
  maxHeight = '16rem',
  className = '',
}: TerminalOutputProps) {
  return (
    <div
      className={`rounded-lg p-4 bg-slate-900 text-slate-300 font-mono text-sm overflow-y-auto ${className}`}
      style={{ maxHeight }}
    >
      {logs.map((log, i) => (
        <div key={i} className="whitespace-pre-wrap">{log}</div>
      ))}
      {isRunning && (
        <div className="animate-pulse text-cyan-400">{runningText}</div>
      )}
    </div>
  );
}
