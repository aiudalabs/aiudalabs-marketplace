-- multicolize.lua — two-column body via `multicol` (NOT the class `twocolumn`
-- option), so footnotes pool into ONE full-width divider at the page bottom.
--
-- multicol forbids floats and sets \chapter inside a column, so we:
--   * open  \begin{multicols}{2} right AFTER each level-1 chapter title
--     (titles stay full-width, above the columns);
--   * close \end{multicols} before the next chapter, before any structural
--     raw block (\frontmatter/\mainmatter/\tableofcontents/\part dividers),
--     and before any full-width band (galleries/tables, marked %MCFW by
--     figurize-mc / table-mc), re-opening after the band if we were inside
--     a chapter;
--   * strip class-level \twocolumn/\onecolumn tokens (the doc is now
--     one-column; those would fight multicol).
--
-- Runs LAST (after figurize/table/chapterend/themebreak), as a Pandoc-level
-- pass so it sees the whole block sequence. PDF/LaTeX only.

local MARK = "%%MCFW"   -- sentinel prefixing a full-width band RawBlock

-- a raw block that must sit OUTSIDE the columns (full page width)
local function is_structural(b)
  if b.t ~= "RawBlock" then return false end
  local t = b.text
  return t:find("\\frontmatter", 1, true) or t:find("\\mainmatter", 1, true)
      or t:find("\\backmatter", 1, true)  or t:find("\\tableofcontents", 1, true)
      or t:find("\\onecolumn", 1, true)   or t:find("\\twocolumn", 1, true)
      or t:find("\\printindex", 1, true)  or t:find("\\part", 1, true)
      or t:find("addcontentsline{toc}{part}", 1, true)
end

local function is_band(b)
  return b.t == "RawBlock" and b.text:sub(1, #MARK) == MARK
end

local function strip_cols(text)            -- neutralise class-level column switches
  return (text:gsub("\\twocolumn%s*", ""):gsub("\\onecolumn%s*", ""))
end

-- a paragraph that is a QR box (\qrref/\qrtool/\qrdemo/\qrhome from figurize-mc)
local function has_qr(blk)
  if blk.t ~= "Para" then return false end
  for _, el in ipairs(blk.content) do
    if el.t == "RawInline" and el.format == "latex" and el.text:find("\\qr", 1, true) then
      return true
    end
  end
  return false
end

function Pandoc(doc)
  if not FORMAT:match("latex") then return nil end
  local out = pandoc.List()
  local open = false
  local function close() if open then out:insert(pandoc.RawBlock("latex", "\\end{multicols}")) open = false end end
  local function start() out:insert(pandoc.RawBlock("latex", "\\begin{multicols}{2}")) open = true end

  local blocks = doc.blocks

  -- mark each H2/H3 whose section (up to the next heading) holds a QR box, so the
  -- heading + its QR stay in one column (the tall QR box otherwise flows away).
  local keepqr = {}                                -- header idx -> reserve fraction
  do
    local hdr, hasfig = nil, false
    for idx, b in ipairs(blocks) do
      if b.t == "Header" then
        hdr = (b.level == 2 or b.level == 3) and idx or nil
        hasfig = false
      elseif hdr then
        if b.t == "RawBlock" and b.text:find("\\includegraphics", 1, true) then hasfig = true end
        if has_qr(b) then keepqr[hdr] = hasfig and "0.62" or "0.45"; hdr = nil end
      end
    end
  end

  local i = 1
  while i <= #blocks do
    local b = blocks[i]
    if b.t == "Header" and b.level == 1 then
      close()
      out:insert(b)
      start()                              -- chapter body -> columns
    elseif is_band(b) then
      local was = open
      close()
      b.text = b.text:sub(#MARK + 1)       -- drop sentinel, keep the band
      out:insert(b)
      if was then start() end              -- resume the chapter's columns
      -- A `---` section divider right after a full-width figure would orphan at
      -- the top of the next page/column (the figure already separates sections),
      -- so drop it.
      local nxt = blocks[i + 1]
      if nxt and nxt.t == "RawBlock" and nxt.text:find("\\thematicrule", 1, true) then
        i = i + 1
      end
    elseif is_structural(b) then
      close()
      b.text = strip_cols(b.text)
      out:insert(b)
    else
      if b.t == "Header" and keepqr[i] then        -- keep heading + its QR together
        out:insert(pandoc.RawBlock("latex", "\\needspace{" .. keepqr[i] .. "\\textheight}"))
      end
      if b.t == "RawBlock" then b.text = strip_cols(b.text) end
      out:insert(b)
    end
    i = i + 1
  end
  close()
  return pandoc.Pandoc(out, doc.meta)
end
