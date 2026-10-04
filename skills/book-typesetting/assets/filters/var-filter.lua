-- var-filter.lua
--
-- Quarto/Pandoc Lua filter for math-variable highlighting in prose.
--
-- Markdown convention:
--   Wrap a variable name in a bracket span with the .var class, e.g.
--     Where [Latency]{.var} is the round-trip time to the server.
--
-- Behavior:
--   * LaTeX/PDF output: rewrite [X]{.var} as \var{X}, so the same
--     \var{} macro defined in the preamble renders the variable in
--     italic blue (#1F3A93). The \var{} macro is dual-mode and works
--     in both math context ($...$) and text context.
--   * HTML output (and others): leave the span untouched so Pandoc's
--     native rendering produces <span class="var">X</span>, ready for
--     CSS styling.
--
-- Spans without the .var class flow through untouched. Other span
-- classes are not affected.

function Span(elem)
  if elem.classes:includes('var') then
    if FORMAT:match('latex') then
      local s = pandoc.utils.stringify(elem.content)
      return pandoc.RawInline('latex', '\\var{' .. s .. '}')
    end
  end
end
