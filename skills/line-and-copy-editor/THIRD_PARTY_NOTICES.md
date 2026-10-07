# Third-party notices

Adapted from **claude-skills**, https://github.com/ghanemzadeh/claude-skills, at commit `3a8037ded4426cce93f6aa0a5fcc6c1f43f48cf8`, by Nasser Ghanemzadeh, used under the MIT license. It reached this marketplace through aimprenta (https://github.com/aiudalabs/aimprenta), which vendors it.

Changes made here:

- Frontmatter converted to this marketplace format (`license`, `metadata.version` and `metadata.source`; harness-specific fields moved into `metadata`).
- Plugin-scoped names (such as `manuscript:humanizer`) and fixed install paths (such as `~/.claude/skills/<name>`), wherever they occur in the Markdown files, are rewritten to the component names and folder placeholders used here, so the text works in every harness.
- `README.md` is left out: it explains how to install from the upstream collection and links to files outside the skill.

License of the upstream project:

```
MIT License

Copyright (c) 2026 Nasser Ghanemzadeh

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
