-- themebreak.lua — scene/section dividers from `---`.
--
-- PRINT (latex): a `---` (HorizontalRule) becomes \thematicrule{} — a centered
-- grey rule defined in the print preamble. Unchanged.
--
-- E-BOOK (epub/html): the author places `---` before every section heading (H2
-- and H3) as a divider, but Quarto's section pass DELETES a `---` that sits
-- directly before a heading, before any filter can see it — and a raw <hr> or
-- empty <div> doesn't survive either. So we can't key off the `---`. Instead we
-- key off the heading (which does survive) and PREPEND the divider:
--     H2, H3 -> preceding divider (matches where the author puts `---`)
--     H4     -> none (the author places no `---` there)
-- A surviving standalone `---` (a mid-text scene break, not before a heading)
-- is converted directly. The divider is a RawBlock <hr>, which survives output.
local function rule()
  return pandoc.RawBlock("html", '<hr class="thematic" />')
end

function Blocks(blocks)
  local out = pandoc.List()
  local prev = nil
  for _, b in ipairs(blocks) do
    if b.t == "HorizontalRule" then
      if FORMAT:match("latex") then
        out:insert(pandoc.RawBlock("latex", "\\thematicrule{}"))
      else
        out:insert(rule())                       -- mid-text scene break
      end
    else
      -- divider before every H2 / H3, EXCEPT a heading sitting directly under a
      -- higher-level heading with nothing between — a rule there would split a
      -- heading from its parent. Covers part-divider pages (H1 "Part IV" -> H2 title)
      -- and an H3 placed immediately after its H2 (H2 -> H3, no intro text).
      if not FORMAT:match("latex") and b.t == "Header" and (b.level == 2 or b.level == 3)
         and not (prev and prev.t == "Header" and prev.level < b.level) then
        out:insert(rule())
      end
      out:insert(b)
    end
    prev = b
  end
  return out
end
