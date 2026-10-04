-- chapternum.lua — strip a leading "N." from chapter titles.
--
-- The input contract writes chapter headings as `# 12. The Title`, because that
-- is how authors number them and how a .docx import recovers them. But the
-- print master also sets
--     \renewcommand*{\chapterformat}{\thechapter.\enskip}
-- so LaTeX prints its own counter. Left alone the two combine into
--     "12. 12. The Title"
--
-- This removes the literal number from the title text, leaving the counter to
-- supply it. The number in the markdown still determines document order and
-- filenames, so nothing is lost.
--
-- The two-column chain gets this behaviour from figurize-mc.lua as well; running
-- both is harmless (the second finds nothing left to strip). PDF/LaTeX only --
-- for EPUB the author's own numbering is what readers see.

function Header(el)
  if not FORMAT:match("latex") then return nil end
  if el.level == 1 and #el.content > 0 and el.content[1].t == "Str"
     and el.content[1].text:match("^%d+%.$") then
    el.content:remove(1)
    while #el.content > 0 and el.content[1].t == "Space" do
      el.content:remove(1)
    end
    return el
  end
end
