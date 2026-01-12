/**
 * File Utilities
 *
 * Shared utilities for file system operations with error handling.
 */

import fs from 'fs/promises';

/**
 * Check if a file exists
 *
 * @param filePath - Path to the file
 * @returns true if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely read and parse a JSON file
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON object or null if file doesn't exist or is invalid
 */
export async function safeReadJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Safely read and parse a JSON file with a default value
 *
 * @param filePath - Path to the JSON file
 * @param defaultValue - Default value if file doesn't exist or is invalid
 * @returns Parsed JSON object or default value
 */
export async function safeReadJsonWithDefault<T>(filePath: string, defaultValue: T): Promise<T> {
  const result = await safeReadJson<T>(filePath);
  return result ?? defaultValue;
}

/**
 * Safely write JSON to a file
 *
 * @param filePath - Path to the JSON file
 * @param data - Data to write
 * @param pretty - Whether to pretty-print the JSON (default: true)
 * @returns true if successful, false otherwise
 */
export async function safeWriteJson<T>(
  filePath: string,
  data: T,
  pretty = true
): Promise<boolean> {
  try {
    const content = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely delete a file (ignores errors if file doesn't exist)
 *
 * @param filePath - Path to the file
 * @returns true if deleted or didn't exist, false on error
 */
export async function safeUnlink(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error: unknown) {
    // ENOENT means file doesn't exist, which is fine
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return true;
    }
    return false;
  }
}

/**
 * Ensure a directory exists (creates it if necessary)
 *
 * @param dirPath - Path to the directory
 * @returns true if directory exists or was created, false on error
 */
export async function ensureDir(dirPath: string): Promise<boolean> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a file as text, returning null on error
 *
 * @param filePath - Path to the file
 * @returns File contents or null if file doesn't exist or can't be read
 */
export async function safeReadText(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
