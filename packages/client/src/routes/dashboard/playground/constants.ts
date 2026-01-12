/**
 * Playground constants
 */

export const STORAGE_KEYS = {
  query: 'orion-playground-query',
  variables: 'orion-playground-variables',
} as const;

export const DEFAULT_QUERY = `query {
  __typename
}`;
