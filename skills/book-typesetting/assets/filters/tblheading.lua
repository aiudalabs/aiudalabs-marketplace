-- tblheading.lua — {.tbl-heading} Div -> centered bold heading + 1pt rule above
-- the table. LaTeX: raw wrapper around rendered inlines (footnotes survive).
-- HTML/EPUB: leave the Div for the .tbl-heading CSS.
function Div(el)
  if el.classes:includes('tbl-heading') then
    if FORMAT:match('latex') then
      local inl = pandoc.utils.blocks_to_inlines(el.content)
      return {
        pandoc.RawBlock('latex', '\\par\\begingroup\\centering\\bfseries\\large'),
        pandoc.Plain(inl),
        pandoc.RawBlock('latex',
          '\\par\\vspace{1pt}\\noindent\\rule{\\linewidth}{1pt}\\par\\endgroup\\nopagebreak\\vspace{0.2em}')
      }
    end
  end
end
