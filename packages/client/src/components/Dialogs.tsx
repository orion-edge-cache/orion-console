/**
 * Dialog Components
 *
 * Reusable modal dialogs for confirmations and alerts.
 */

import { useState } from "react";
import { Card, Title, Text, Button, Flex } from "@tremor/react";
import { X, ExternalLink, AlertTriangle, Check } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText: string;
  confirmColor?: "red" | "emerald" | "blue";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmText,
  confirmColor = "red",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <Flex justifyContent="between" alignItems="start" className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <Title>{title}</Title>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </Flex>
        <Text className="mb-6">{message}</Text>
        <Flex justifyContent="end" className="gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button color={confirmColor} onClick={onConfirm}>
            {confirmText}
          </Button>
        </Flex>
      </Card>
    </div>
  );
}

interface AlertDialogProps {
  title: string;
  message: string;
  linkText?: string;
  linkUrl?: string;
  showDontShowAgain?: boolean;
  onDontShowAgain?: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
  confirmText?: string;
}

export function AlertDialog({
  title,
  message,
  linkText,
  linkUrl,
  showDontShowAgain,
  onDontShowAgain,
  onConfirm,
  onDismiss,
  confirmText = "Run",
}: AlertDialogProps) {
  const [dontShowChecked, setDontShowChecked] = useState(false);

  const handleConfirm = () => {
    if (dontShowChecked && onDontShowAgain) {
      onDontShowAgain();
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <Flex justifyContent="between" alignItems="start" className="mb-4">
          <Title>{title}</Title>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </Flex>
        <Text className="mb-6">{message}</Text>

        {showDontShowAgain && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${dontShowChecked
                ? "bg-blue-500 border-blue-500"
                : "border-slate-300 hover:border-slate-400"
                }`}
              onClick={() => setDontShowChecked(!dontShowChecked)}
            >
              {dontShowChecked && <Check className="w-3 h-3 text-white" />}
            </div>
            <span
              className="text-sm text-slate-600"
              onClick={() => setDontShowChecked(!dontShowChecked)}
            >
              Don't show this again
            </span>
          </label>
        )}

        <Flex justifyContent="end" className="gap-3">
          {linkUrl && (
            <Button
              variant="secondary"
              icon={ExternalLink}
              iconPosition="right"
              onClick={() => window.open(linkUrl, "_blank")}
            >
              {linkText || "Learn More"}
            </Button>
          )}
          <Button onClick={handleConfirm}>{confirmText}</Button>
        </Flex>
      </Card>
    </div>
  );
}

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  const bgColor = type === "success" ? "bg-emerald-50" : "bg-red-50";
  const borderColor =
    type === "success" ? "border-emerald-200" : "border-red-200";
  const textColor = type === "success" ? "text-emerald-700" : "text-red-700";

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div
        className={`${bgColor} ${borderColor} border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3`}
      >
        <Text className={`${textColor} font-medium`}>{message}</Text>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
