-- chapterend.lua
-- Chapter-end ornament: a centered "* * *" (\chapterend, defined in the master
-- preamble) closes each chapter's narrative, immediately before its "## Endnotes".
--
-- Every chapter body ends ...narrative... / "---" / "## Endnotes". That trailing
-- "---" is the narrative→apparatus separator, so we REPLACE it with the ornament
-- (one clean mark, not a rule AND asterisks). If a chapter has no such rule, we
-- just insert the ornament before the heading.
--
-- MUST run BEFORE _filters/themebreak.lua, so we still see a raw HorizontalRule
-- here (themebreak would otherwise have turned it into \thematicrule first).
-- PDF/LaTeX output only.

local function is_endnotes(b)
  return b.t == "Header" and b.level == 2
     and pandoc.utils.stringify(b.content):gsub("%s+", ""):lower() == "endnotes"
end

function Pandoc(doc)
  if not FORMAT:match("latex") then return nil end
  local out = {}
  for _, b in ipairs(doc.blocks) do
    if is_endnotes(b) then
      -- Replace the "Endnotes" heading with the chapter-end ornament. Print has
      -- no endnotes section (footnotes sit at page bottoms), and keeping the
      -- heading leaves a stray "Endnotes" section that also hijacks the recto
      -- running head. The references-note + QR that follow it are kept.
      if #out > 0 and out[#out].t == "HorizontalRule" then
        out[#out] = pandoc.RawBlock("latex", "\\chapterend{}")   -- replace the rule
      else
        out[#out + 1] = pandoc.RawBlock("latex", "\\chapterend{}")
      end
      -- (drop the heading: do NOT re-add b)
    else
      out[#out + 1] = b
    end
  end
  return pandoc.Pandoc(out, doc.meta)
end
