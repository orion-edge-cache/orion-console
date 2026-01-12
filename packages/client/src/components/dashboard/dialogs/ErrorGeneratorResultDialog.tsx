import { CheckCircle, XCircle, X, AlertTriangle } from "lucide-react";
import { Card, Title, Text, Flex } from "@tremor/react";
import type { ErrorGeneratorResult } from "../../../services";

interface ErrorGeneratorResultDialogProps {
  result: ErrorGeneratorResult;
  onClose: () => void;
}

export function ErrorGeneratorResultDialog({ result, onClose }: ErrorGeneratorResultDialogProps) {
  const both4xxAnd5xxTriggered =
    result.error4xx && result.error4xx.status >= 400 && result.error4xx.status < 500 &&
    result.error5xx && result.error5xx.status >= 500;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <Flex justifyContent="between" alignItems="start" className="mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                both4xxAnd5xxTriggered ? "bg-emerald-100" : "bg-amber-100"
              }`}
            >
              {both4xxAnd5xxTriggered ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <Title>Error Generation Complete</Title>
              <Text className="text-sm text-slate-500">
                {both4xxAnd5xxTriggered ? "Both errors triggered successfully" : "Some errors may not have triggered correctly"}
              </Text>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </Flex>

        <div className="space-y-3">
          {/* 4xx Error Result */}
          <div className={`rounded-lg p-4 ${
            result.error4xx && result.error4xx.status >= 400 && result.error4xx.status < 500
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-red-50 border border-red-200"
          }`}>
            <Flex justifyContent="between" alignItems="center">
              <div>
                <Text className="font-semibold">4xx Client Error</Text>
                <Text className="text-sm text-slate-600">
                  {result.error4xx?.message || "Not triggered"}
                </Text>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-mono ${
                result.error4xx && result.error4xx.status >= 400 && result.error4xx.status < 500
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {result.error4xx?.status || "N/A"}
              </div>
            </Flex>
          </div>

          {/* 5xx Error Result */}
          <div className={`rounded-lg p-4 ${
            result.error5xx && result.error5xx.status >= 500
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-red-50 border border-red-200"
          }`}>
            <Flex justifyContent="between" alignItems="center">
              <div>
                <Text className="font-semibold">5xx Server Error</Text>
                <Text className="text-sm text-slate-600">
                  {result.error5xx?.message || "Not triggered"}
                </Text>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-mono ${
                result.error5xx && result.error5xx.status >= 500
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {result.error5xx?.status || "N/A"}
              </div>
            </Flex>
          </div>
        </div>

        <Text className="text-xs text-slate-500 mt-4 text-center">
          Check the Analytics page to see these errors in the Errors stat card
        </Text>
      </Card>
    </div>
  );
}
