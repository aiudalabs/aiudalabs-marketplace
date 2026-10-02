// Registry of harness adapters. To add a harness, create `<id>.mjs` next to
// this file and list it here. See adapters/README.md for the contract.

import claudeCode from './claude-code.mjs';
import codex from './codex.mjs';
import copilot from './copilot.mjs';
import cursor from './cursor.mjs';
import geminiCli from './gemini-cli.mjs';
import opencode from './opencode.mjs';
import osaurus from './osaurus.mjs';

export const adapters = [claudeCode, cursor, codex, geminiCli, opencode, copilot, osaurus];

export const getAdapter = (id) => adapters.find((adapter) => adapter.id === id);
