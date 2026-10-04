-- figurize-mc.lua — figures for a two-column (multicol) print layout.
--
-- multicol forbids floats, so:
--   * a single figure becomes an INLINE \includegraphics + \captionof
--     (no `figure` environment, placed exactly where it sits);
--   * a montage/gallery becomes a %MCFW-marked full-width band (a centered
--     row of \includegraphics + \captionof) that multicolize.lua breaks out
--     of the columns.
-- It also converts raw <img>/<a> HTML to Images or boxed QR codes, colours
-- math, and strips the leading chapter "N." from figure captions.
--
-- ============================ CONFIGURE ME ============================
-- The three tables below are per-book. They ship EMPTY: with no entries every
-- figure renders at full size in a single column, which is the right default.
-- Fill them in only when a specific figure misbehaves on the page.
-- ======================================================================

local utils = pandoc.utils
local MARK = "%%MCFW"        -- sentinel consumed by multicolize.lua

-- Per-figure size override: figure id -> fraction of full size. For a montage
-- that is a fraction of the full-width band; for a single figure it is a
-- fraction of the COLUMN width. Absent (or 1.0) means full size.
-- Ids are whatever your image filenames use, e.g. "fig02-05" for Figure 2.5.
--   ["fig02-05"] = 0.33,   -- tall portrait shot; keep it from eating the column
--   ["fig12-03"] = 0.8,    -- full-width band with 10% padding each side
local FIG_SCALE = {
}

-- Single figures that should span BOTH columns (full text width) instead of
-- sitting inside one column: figure id -> true. These break out of multicol the
-- same way a montage band does. Combine with FIG_SCALE to inset from the edges.
--   ["fig08-08"] = true,
local FIG_FULLWIDTH = {
}

local function is_fig_caption(blk)
  if blk == nil or blk.t ~= "Para" then return false end
  for _, el in ipairs(blk.content) do
    if el.t == "Space" or el.t == "SoftBreak" then
    elseif el.t == "Strong" then
      return utils.stringify(el):match("^Figure%s") ~= nil
    else return false end
  end
  return false
end

local function lone_image(blk)
  if blk.t == "Para" then
    local imgs = {}
    for _, el in ipairs(blk.content) do
      if el.t == "Image" then imgs[#imgs+1] = el
      elseif el.t == "Space" or el.t == "SoftBreak" then
      else return nil end
    end
    if #imgs == 1 then return imgs[1] end
  elseif blk.t == "Figure" then
    local found
    blk:walk{ Image = function(im) found = im end }
    return found
  end
  return nil
end

-- base width fraction from canonical width="NN%" (default full column)
local function base_frac(img)
  local w = img and img.attributes and img.attributes.width
  local n = w and tostring(w):match("^(%d+%.?%d*)%%$")
  return n and tonumber(n) / 100 or 1.0
end

local function caption_latex(capblk)
  if not capblk then return nil end
  return pandoc.write(pandoc.Pandoc({ pandoc.Plain(capblk.content) }), "latex")
end

-- INLINE single figure (no float env): sits exactly where written, in-column,
-- centred. Width = canonical width% x print FIG_SCALE override.
local function inline_figure(img, capblk)
  local id = img.src:match("(fig%d+%-%d+)") or img.src:match("([%w%-]+)%.%w+$")  -- fig id, else filename stem
  local frac = base_frac(img) * ((id and FIG_SCALE[id]) or 1.0)
  local tex = "\\par\\addvspace{14pt}\n"   -- padding BEFORE the figure
    .. string.format("\\centerline{\\includegraphics[width=%.4f\\linewidth,keepaspectratio]{%s}}\n", frac, img.src)
  local cap = caption_latex(capblk)
  if cap then tex = tex .. "\\par\\nopagebreak\\captionof{figure}[]{" .. cap .. "}\n" end
  return pandoc.RawBlock("latex", tex .. "\\par\\addvspace{9pt}")   -- padding AFTER the caption
end

-- a single figure forced to FULL text width (spans both columns): same as
-- inline_figure but %MCFW-marked so multicolize breaks it out of the columns.
local function fullwidth_figure(img, capblk)
  local id = img.src:match("(fig%d+%-%d+)")
  local frac = base_frac(img) * ((id and FIG_SCALE[id]) or 1.0)
  local tex = MARK .. "\n\\par\\addvspace{14pt}\n"
    .. string.format("\\centerline{\\includegraphics[width=%.4f\\linewidth,keepaspectratio]{%s}}\n", frac, img.src)
  local cap = caption_latex(capblk)
  if cap then tex = tex .. "\\par\\nopagebreak\\captionof{figure}[]{" .. cap .. "}\n" end
  return pandoc.RawBlock("latex", tex .. "\\par\\addvspace{9pt}")
end

-- ---- montage / gallery (2+ panels) -> full-width band, marked for multicolize.
-- Panels render at EQUAL HEIGHT, each keeping its own aspect ratio (no
-- distortion) — same as the EPUB flex row. They go in one row at a reference
-- height, then \resizebox scales the WHOLE row (heights stay equal, aspects
-- preserved) to a fraction of the text width: 1.0 = full by default, overridden
-- per figure via FIG_SCALE (top of file). Canonical width="NN%" is ignored for
-- print montages (EPUB uses it).

local function montage_srcs(b)
  local srcs = {}
  if b.t == "Div" then
    b:walk{ Image = function(im) srcs[#srcs + 1] = im.src end }
  elseif b.t == "RawBlock" and b.format == "html" then
    for tag in b.text:gmatch("<img[^>]*>") do
      local s = tag:match('src="([^"]+)"'); if s then srcs[#srcs + 1] = s end
    end
  end
  return srcs
end

local function is_montage(b)
  return (b.t == "Div" or (b.t == "RawBlock" and b.format == "html")) and #montage_srcs(b) >= 2
end

local function montage_band(b, capblk)
  local srcs = montage_srcs(b)
  local id = srcs[1] and srcs[1]:match("(fig%d+%-%d+)")
  local scale = (id and FIG_SCALE[id]) or 1.0
  local imgs = {}
  for _, s in ipairs(srcs) do
    imgs[#imgs + 1] = string.format("\\includegraphics[height=3cm]{%s}", s)   -- equal ref height; resizebox rescales
  end
  local row = table.concat(imgs, "\\hspace{5pt}")
  local tex = MARK .. "\n\\par\\addvspace{14pt}\n"   -- padding BEFORE the figure
    .. string.format("\\centerline{\\resizebox{%.4f\\linewidth}{!}{%s}}\n", scale, row)
  local cap = caption_latex(capblk)
  if cap then tex = tex .. "\\par\\nopagebreak\\captionof{figure}[]{" .. cap .. "}\n" end
  return pandoc.RawBlock("latex", tex .. "\\par\\addvspace{9pt}")   -- padding AFTER the caption
end

-- A Para that is an image immediately followed by its "Figure …" caption — image
-- and caption on consecutive lines with NO blank between, so pandoc makes them ONE
-- paragraph. Split so the caption gets real \captionof styling (7.5pt + skip)
-- instead of rendering as body-size bold text.
local function img_with_caption(blk)
  if blk.t ~= "Para" then return nil end
  local c = blk.content
  if not (c[1] and c[1].t == "Image") then return nil end
  local j = 2
  while c[j] and (c[j].t == "Space" or c[j].t == "SoftBreak") do j = j + 1 end
  if c[j] and c[j].t == "Strong" and utils.stringify(c[j]):match("^Figure%s") then
    local cap = {}
    for k = j, #c do cap[#cap + 1] = c[k] end
    return c[1], pandoc.Para(cap)
  end
  return nil
end

function Blocks(blocks)
  local out = pandoc.List()
  local i = 1
  while i <= #blocks do
    local b, nxt = blocks[i], blocks[i + 1]
    if FORMAT:match("latex") and is_montage(b) then
      local cap = is_fig_caption(nxt) and nxt or nil
      out:insert(montage_band(b, cap))
      i = i + (cap and 2 or 1)
    elseif FORMAT:match("latex") then
      local function emit(im, cap)
        local id = im.src:match("(fig%d+%-%d+)")
        return (id and FIG_FULLWIDTH[id]) and fullwidth_figure(im, cap) or inline_figure(im, cap)
      end
      local cimg, ccap = img_with_caption(b)       -- image + caption in one paragraph
      if cimg then
        out:insert(emit(cimg, ccap))
        i = i + 1
      else
        local img = lone_image(b)                   -- image alone, caption in next block
        if img and is_fig_caption(nxt) then
          out:insert(emit(img, nxt))
          i = i + 2
        elseif img and nxt and nxt.t == "HorizontalRule" and is_fig_caption(blocks[i + 2]) then
          out:insert(emit(img, blocks[i + 2]))       -- drop a stray `---` between image and caption
          i = i + 3
        else
          out:insert(b); i = i + 1
        end
      end
    else
      out:insert(b); i = i + 1
    end
  end
  return out
end

-- ---- raw <a href><img> / bare <img> -> Image or boxed QR box
--
-- CONFIGURE ME: your companion-site domain, matched as a Lua pattern (so escape
-- the dot as "%."). Links to it get the neutral \qrhome box. Leave nil if the
-- book has no companion site.
local HOME_DOMAIN = nil        -- e.g. "example%-book%.com"

-- CONFIGURE ME: friendly captions for individual tool QRs, keyed by the
-- /tools/<slug>/ segment of the QR's link. Anything not listed falls back to a
-- generic caption, so this can stay empty.
--   ["pricing-calculator"] = "Pricing Calculator",
local QR_CAPTION = {
}

local function qr_macro(url, src)
  local u = (url or ""):lower()
  local slug = u:match("/tools/([%w%-]+)")
  local cap = slug and QR_CAPTION[slug]
  if u:match("/references/") then            return "\\qrref{" .. src .. "}"
  elseif u:match("/tools/") or u:match("github%.com") then
                                             return "\\qrtool{" .. src .. "}{" .. (cap or "Scan to open the tool") .. "}"
  elseif u:match("/demos") or u:match("/case") or u:match("/call") then
                                             return "\\qrdemo{" .. src .. "}{Scan to open the demo}"
  elseif HOME_DOMAIN and u:match(HOME_DOMAIN) then
                                             return "\\qrhome{" .. src .. "}{" .. (cap or "Scan to open the companion site") .. "}"
  end
  return "\\qrref{" .. src .. "}"
end

function Inlines(inlines)
  local out, href = pandoc.List(), nil
  for _, el in ipairs(inlines) do
    if el.t == "RawInline" and el.format == "html" then
      local h = el.text:match('<a%s[^>]-href="([^"]+)"')
      if h then href = h end
      local src = el.text:match('<img[^>]-src="([^"]+)"')
      if src then
        -- a QR is either in /qr/ or carries the 120px QR-size convention; box it.
        if src:match("/qr/") or el.text:match("120px") then
          out:insert(pandoc.RawInline("latex", qr_macro(href, src)))
        else
          local w = el.text:match('<img[^>]-width="([^"]+)"')   -- keep width for montage/figure sizing
          local attr = w and pandoc.Attr("", {}, { { "width", w } }) or pandoc.Attr()
          out:insert(pandoc.Image({}, src, "", attr))
        end
        href = nil
      elseif el.text:match("^%s*</a>") then
        href = nil
      elseif el.text:match("^%s*<a[%s>]") then
      else
        out:insert(el)
      end
    else
      out:insert(el)
    end
  end
  return out
end

function Math(el)
  if FORMAT:match("latex") then
    el.text = el.text:gsub("\\color{#1F3A93}", "\\color{varblue}")
    return el
  end
end

function Header(el)
  if el.level == 1 and #el.content > 0 and el.content[1].t == "Str"
     and el.content[1].text:match("^%d+%.$") then
    el.content:remove(1)
    while #el.content > 0 and el.content[1].t == "Space" do el.content:remove(1) end
    return el
  end
end
