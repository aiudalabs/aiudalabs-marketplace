-- table-mc.lua — multicol variant of table-fullwidth.lua.
-- multicol forbids the `strip`/`cuted` band, so instead of wrapping the table
-- in \begin{strip} we emit a %MCFW-marked RawBlock; multicolize.lua breaks it
-- out of the columns (\end{multicols} ... \begin{multicols}) so the table sets
-- full page width in one column. longtable is still illegal there, so we
-- convert it to a plain `tabular`. PDF/LaTeX only.

local MARK = "%%MCFW"

local function longtable_to_tabular(tex)
  tex = tex:gsub("\\begin{longtable}%[%]", "\\begin{tabular}")
  tex = tex:gsub("\\noalign{}", "")
  tex = tex:gsub("\\endfirsthead", "")
  tex = tex:gsub("\\endhead", "")
  tex = tex:gsub("\\bottomrule%s*\\endlastfoot", "")
  tex = tex:gsub("\\endlastfoot", "")
  tex = tex:gsub("\\endfoot", "")
  tex = tex:gsub("\\end{longtable}", "\\bottomrule\n\\end{tabular}")
  return tex
end

local function band(tex)
  return pandoc.RawBlock("latex", MARK .. "\n\\par\\medskip{\\centering\n" .. tex .. "\n\\par}\\medskip")
end

local function tex_of(block)
  return pandoc.write(pandoc.Pandoc({ block }), "latex")
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
      out:insert(band(longtable_to_tabular(tex_of(b))))
      i = i + 1
    elseif is_tbl_heading(b) and blocks[i + 1] and blocks[i + 1].t == "Table" then
      -- heading on its OWN line ABOVE the table (a plain \n leaves it inline,
      -- so it lands to the LEFT of the table box); \par drops the table below.
      -- \nopagebreak between the heading and the table so the heading can't
      -- strand at the bottom of a column/page with the table on the next.
      local head = "{\\sffamily\\bfseries " .. tex_of(b):gsub("%s+$", "") .. "}\\par\\nopagebreak[4]\\vspace{4pt}\\nopagebreak[4]\n"
      out:insert(band(head .. longtable_to_tabular(tex_of(blocks[i + 1]))))
      i = i + 2
    else
      out:insert(b)
      i = i + 1
    end
  end
  return out
end
