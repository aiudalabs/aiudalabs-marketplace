# MCPs

Reserved for canonical MCP server definitions that adapters will render into each harness's configuration.

The format is not defined yet. The validator and the CLI ignore this folder.

The reason it needs an adapter layer: harnesses do not agree on where MCP servers are configured or under which key. For example, several use a JSON file with an `mcpServers` key, VS Code uses `.vscode/mcp.json` with `servers`, OpenCode uses `opencode.json` with `mcp`, and Codex uses TOML tables in `config.toml`.

Installing an MCP server also means merging into a config file the user already owns, which is riskier than writing a new file. That merge behavior needs a design before any code is written.
