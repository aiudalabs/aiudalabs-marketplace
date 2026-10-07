# Third-party notices

Adapted from **book-typesetting-skill**, https://github.com/yoelf22/book-typesetting-skill, at commit `736461b67d58a9321bf1d8bd4fe40e03284cd565`, by Yoel Frischoff, used under the MIT license. It reached this marketplace through aimprenta (https://github.com/aiudalabs/aimprenta), which vendors it.

Changes made here:

- Frontmatter converted to this marketplace format (`license`, `metadata.version` and `metadata.source`; harness-specific fields moved into `metadata`).
- Plugin-scoped names (such as `manuscript:humanizer`) and fixed install paths (such as `~/.claude/skills/<name>`), wherever they occur in the Markdown files, are rewritten to the component names and folder placeholders used here, so the text works in every harness.
- Installed as a plain skill folder: `INSTALL.sh`, `README.md` and `.gitignore` are left out, as upstream's own installer does; `LICENSE` and `NOTICE.md` are kept.
- Paths under `~/.claude/skills/book-typesetting` are written as `<book-typesetting skill folder>`, because each harness installs skills in its own folder.

License of the upstream project:

```
MIT License

Copyright (c) 2026 Yoel Frischoff

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
