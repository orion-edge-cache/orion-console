import { CheckCircle, XCircle, X } from "lucide-react";
import { Card, Title, Text, Badge, Button, Flex } from "@tremor/react";
import type { CacheTestsResult } from "../../../services";

interface CacheTestsResultDialogProps {
  result: CacheTestsResult;
  onClose: () => void;
}

export function CacheTestsResultDialog({ result, onClose }: CacheTestsResultDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
      <Card className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        <Flex justifyContent="between" alignItems="start" className="mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                result.success ? "bg-emerald-100" : "bg-red-100"
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <Title>Cache Test Results</Title>
              <Text className="text-sm text-slate-500">
                {result.totalPassed} passed, {result.totalFailed} failed
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

        {result.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <Text className="text-red-700">{result.error}</Text>
          </div>
        ) : (
          <div className="space-y-4">
            {result.suites.map((suite) => (
              <div
                key={suite.name}
                className="border border-slate-200 rounded-lg p-4"
              >
                <Flex justifyContent="between" alignItems="center" className="mb-3">
                  <Text className="font-semibold">{suite.name}</Text>
                  <Badge color={suite.failed === 0 ? "emerald" : "red"}>
                    {suite.passed}/{suite.passed + suite.failed} passed
                  </Badge>
                </Flex>
                <div className="space-y-2">
                  {suite.results.map((test, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm"
                    >
                      {test.passed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={test.passed ? "text-slate-700" : "text-red-700"}>
                        {test.name}
                      </span>
                      <span className="text-slate-400 text-xs">
                        ({test.duration}ms)
                      </span>
                      {test.error && (
                        <span className="text-red-500 text-xs">
                          - {test.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {suite.name === "Surrogate Keys" && (
                  <Text className="text-xs text-slate-500 mt-2 italic">
                    Note: Uses X-Debug-Entities header (Surrogate-Key is stripped by Fastly before client delivery)
                  </Text>
                )}
              </div>
            ))}
          </div>
        )}

        <Flex justifyContent="between" alignItems="center" className="mt-6">
          <Text className="text-sm text-slate-500">
            Duration: {(result.duration / 1000).toFixed(2)}s
          </Text>
          <Button onClick={onClose}>Close</Button>
        </Flex>
      </Card>
    </div>
  );
}
