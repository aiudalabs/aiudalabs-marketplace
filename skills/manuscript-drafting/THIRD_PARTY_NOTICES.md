# Third-party notices

Adapted from **research-skills**, https://github.com/neuromechanist/research-skills, at commit `af4f609f395d825ea2d2dadddc223be70ae904da`, by Seyed (Yahya) Shirazi, used under the BSD-3-Clause license. It reached this marketplace through aimprenta (https://github.com/aiudalabs/aimprenta), which vendors it.

Changes made here:

- Frontmatter converted to this marketplace format (`license`, `metadata.version` and `metadata.source`; harness-specific fields moved into `metadata`).
- Plugin-scoped names (such as `manuscript:humanizer`) and fixed install paths (such as `~/.claude/skills/<name>`), wherever they occur in the Markdown files, are rewritten to the component names and folder placeholders used here, so the text works in every harness.
- Renamed from `manuscript-writing` to `manuscript-drafting`, as aimprenta does, because a second upstream skill uses the same name.

License of the upstream project:

```
BSD 3-Clause License

Copyright (c) 2026, Seyed (Yahya) Shirazi

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
