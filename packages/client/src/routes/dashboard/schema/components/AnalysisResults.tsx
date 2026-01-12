/**
 * AnalysisResults Component
 *
 * Displays schema analysis results with entities, queries, and mutations.
 */

import { Database, Search, Zap, GitBranch } from 'lucide-react';
import {
  Card,
  Title,
  Text,
  Flex,
  Badge,
  Grid,
  Accordion,
  AccordionHeader,
  AccordionBody,
  AccordionList,
} from '@tremor/react';
import type { SchemaAnalysis } from '../../../../services';
import { StatCard } from './StatCard';

interface AnalysisResultsProps {
  analysis: SchemaAnalysis;
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const entityTypes = analysis.entities.filter((e) => !e.characteristics.isRootType);

  return (
    <Card>
      <Title className="mb-4">Schema Analysis</Title>

      <Grid numItemsMd={2} numItemsLg={4} className="gap-4 mb-6">
        <StatCard
          icon={<Database className="w-5 h-5" />}
          label="Entity Types"
          value={entityTypes.length.toString()}
        />
        <StatCard
          icon={<Search className="w-5 h-5" />}
          label="Queries"
          value={analysis.queries.length.toString()}
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Mutations"
          value={analysis.mutations.length.toString()}
        />
        <StatCard
          icon={<GitBranch className="w-5 h-5" />}
          label="Relationships"
          value={analysis.relationships.length.toString()}
        />
      </Grid>

      <AccordionList>
        {/* Entity Types */}
        <Accordion>
          <AccordionHeader>
            <Flex className="gap-2 items-center">
              <Database className="w-4 h-4" />
              <Text className="font-medium">Entity Types ({entityTypes.length})</Text>
            </Flex>
          </AccordionHeader>
          <AccordionBody>
            <div className="space-y-2">
              {entityTypes.map((entity) => (
                <div
                  key={entity.name}
                  className="p-3 rounded-lg bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <Text className="font-mono font-medium">{entity.name}</Text>
                    <Text className="text-xs text-slate-500">
                      {entity.fields.length} fields
                    </Text>
                  </div>
                  <Flex className="gap-1">
                    {entity.characteristics.isVolatile && (
                      <Badge color="amber" size="xs">Volatile</Badge>
                    )}
                    {entity.characteristics.isUserSpecific && (
                      <Badge color="blue" size="xs">User-Specific</Badge>
                    )}
                    {entity.characteristics.hasSensitiveFields && (
                      <Badge color="red" size="xs">Sensitive</Badge>
                    )}
                  </Flex>
                </div>
              ))}
            </div>
          </AccordionBody>
        </Accordion>

        {/* Queries */}
        <Accordion>
          <AccordionHeader>
            <Flex className="gap-2 items-center">
              <Search className="w-4 h-4" />
              <Text className="font-medium">Queries ({analysis.queries.length})</Text>
            </Flex>
          </AccordionHeader>
          <AccordionBody>
            <div className="space-y-2">
              {analysis.queries.map((query) => (
                <div key={query.name} className="p-3 rounded-lg bg-slate-50">
                  <Text className="font-mono font-medium">{query.name}</Text>
                  <Text className="text-xs text-slate-500">
                    Returns: {query.returnsList ? `[${query.returnType}]` : query.returnType}
                  </Text>
                </div>
              ))}
            </div>
          </AccordionBody>
        </Accordion>

        {/* Mutations */}
        <Accordion>
          <AccordionHeader>
            <Flex className="gap-2 items-center">
              <Zap className="w-4 h-4" />
              <Text className="font-medium">Mutations ({analysis.mutations.length})</Text>
            </Flex>
          </AccordionHeader>
          <AccordionBody>
            <div className="space-y-2">
              {analysis.mutations.map((mutation) => (
                <div key={mutation.name} className="p-3 rounded-lg bg-slate-50">
                  <Text className="font-mono font-medium">{mutation.name}</Text>
                  <Text className="text-xs text-slate-500">
                    Affects: {mutation.affectedTypes.join(', ') || 'None detected'}
                  </Text>
                </div>
              ))}
            </div>
          </AccordionBody>
        </Accordion>
      </AccordionList>
    </Card>
  );
}
