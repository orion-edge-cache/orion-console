/**
 * State management constants
 */

import path from 'path';
import os from 'os';

export const ORION_CONFIG_DIR = path.join(os.homedir(), '.config/orion');
export const TFSTATE_PATH = path.join(ORION_CONFIG_DIR, 'terraform.tfstate');
export const LOCK_PATH = path.join(ORION_CONFIG_DIR, 'operation.lock');
export const VERSION = '1.0.0';
