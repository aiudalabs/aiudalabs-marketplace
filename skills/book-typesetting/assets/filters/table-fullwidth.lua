-- table-fullwidth.lua — make canonical markdown tables work in the two-column
-- print layout. Pandoc emits each table as a `longtable`, which is ILLEGAL
-- inside a column ("longtable not in 1-column mode") and `strip` doesn't change
-- that. So we render the table, convert the longtable to a plain `tabular`
-- (no 1-column requirement), and wrap it in a full-width `strip` (cuted) so it
-- spans BOTH columns without forcing a page break. PDF/LaTeX output only.

local function longtable_to_tabular(tex)
  tex = tex:gsub("\\begin{longtable}%[%]", "\\begin{tabular}")
  tex = tex:gsub("\\noalign{}", "")
  tex = tex:gsub("\\endfirsthead", "")
  tex = tex:gsub("\\endhead", "")
  tex = tex:gsub("\\bottomrule%s*\\endlastfoot", "")   -- drop the foot's rule + marker
  tex = tex:gsub("\\endlastfoot", "")
  tex = tex:gsub("\\endfoot", "")
  tex = tex:gsub("\\end{longtable}", "\\bottomrule\n\\end{tabular}")
  return tex
end

local function strip(tex)
  return pandoc.RawBlock("latex", "\\begin{strip}\\centering\n" .. tex .. "\n\\end{strip}")
end

local function tex_of(block)
  return pandoc.write(pandoc.Pandoc({block}), "latex")
end

local function is_tbl_heading(b)
  return b and b.t == "Div" and b.classes:includes("tbl-heading")
end

function Blocks(blocks)
  if not FORMAT:match("latex") then return nil end
  local out = pandoc.List()
  local i = 1
  while i <= #blocks do
    local b = blocks[i]
    if b.t == "Table" then
      out:insert(strip(longtable_to_tabular(tex_of(b))))
      i = i + 1
    elseif is_tbl_heading(b) and blocks[i + 1] and blocks[i + 1].t == "Table" then
      out:insert(strip(tex_of(b) .. "\n" .. longtable_to_tabular(tex_of(blocks[i + 1]))))
      i = i + 2
    else
      out:insert(b)
      i = i + 1
    end
  end
  return out
end
