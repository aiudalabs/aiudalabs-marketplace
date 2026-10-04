# Third-party notices

Adapted from **academic-human-in-the-loop**, https://github.com/OpenGHz/academic-human-in-the-loop, at commit `444bdaefd9d3ebb23cfabf3b4acafc15475ae8eb`, by wanshuiyin, used under the MIT license. It reached this marketplace through aimprenta (https://github.com/aiudalabs/aimprenta), which vendors it.

Changes made here:

- Frontmatter converted to this marketplace format (`license`, `metadata.version` and `metadata.source`; harness-specific fields moved into `metadata`).
- Each reviewer call runs as a fresh subagent instead of the OpenAI Codex MCP; an adaptation note at the top of SKILL.md explains the substitution, and `allowed-tools` lists `Agent` instead of `mcp__codex__codex`.
- `shared-references/` and the two scripts in `tools/` are bundled inside the skill folder (upstream keeps them at the repository root), and links to them are rewritten.

License of the upstream project:

```
MIT License

Copyright (c) 2026 wanshuiyin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
