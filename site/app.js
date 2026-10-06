// The catalog browser. Reads window.MARKETPLACE (data.js, generated at build
// time) and renders three views from the URL hash:
//   #/                       how it works
//   #/browse[/<kinds>][?q=]  the catalog
//   #/<kind>/<name>          one component
(() => {
  const DATA = window.MARKETPLACE;
  const KINDS = [
    { id: 'stack', plural: 'stacks', label: 'Stacks' },
    { id: 'workflow', plural: 'workflows', label: 'Workflows' },
    { id: 'skill', plural: 'skills', label: 'Skills' },
    { id: 'agent', plural: 'agents', label: 'Agents' },
    { id: 'external', plural: 'externals', label: 'Externals' },
  ];
  const ICONS = {
    stack: 'M10 3l7 3.5-7 3.5-7-3.5zM3 10l7 3.5 7-3.5M3 13.5L10 17l7-3.5',
    workflow: 'M5 4v4a3 3 0 0 0 3 3h4a3 3 0 0 1 3 3v2M5 4m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0M15 16m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0',
    skill: 'M6 3h6l3 3v11H6zM12 3v3h3M8.5 10h4M8.5 13h4',
    agent: 'M10 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 17a6 6 0 0 1 12 0',
    external: 'M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8',
  };
  const SVG = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const byKey = new Map(DATA.items.map((item) => [`${item.kind}/${item.name}`, item]));
  const find = (ref) => byKey.get(`${ref.kind}/${ref.name}`);
  const countOf = (kind) => DATA.items.filter((item) => item.kind === kind).length;

  // Storage can be unavailable (private windows, blocked site data); the page works without it.
  const store = {
    get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* not saved */ } },
  };

  const state = {
    harness: store.get('harness', DATA.harnesses[0].id),
    selection: new Set(store.get('selection', '').split(' ').filter((key) => byKey.has(key))),
  };
  if (!DATA.harnesses.some((harness) => harness.id === state.harness)) state.harness = DATA.harnesses[0].id;
  const harness = () => DATA.harnesses.find((entry) => entry.id === state.harness);

  // h('a', { class: 'x', href: '#' }, 'text', node): builds DOM with text nodes, never innerHTML.
  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    node.append(...children.flat().filter((child) => child !== null && child !== undefined && child !== false));
    return node;
  }

  function icon(kind) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('width', '60%');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', ICONS[kind]);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return h('span', { class: 'icon' }, svg);
  }

  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
  const summary = (text) => (String(text).replace(/\s+/g, ' ').match(/^.+?[.!?](\s|$)/)?.[0] ?? text).trim();
  const link = (item) => `#/${item.kind}/${item.name}`;

  function command(refs) {
    const target = harness();
    return `npx github:${DATA.repository} add ${refs.join(' ')} --harness ${target.id}${target.skills ? '' : ' --global'}`;
  }

  let toastTimer;
  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 1600);
  }

  // Confirms on the button itself, where the eye already is, and in the live region for screen readers.
  async function copy(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return toast('Select the command and copy it');
    }
    toast('Copied to the clipboard');
    if (!button || button.dataset.label) return;
    button.dataset.label = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = button.dataset.label; delete button.dataset.label; }, 1400);
  }

  const commandBox = (text, slash = false) => h('div', { class: `command-box${slash ? ' slash' : ''}` },
    h('code', {}, text),
    h('button', { class: 'copy', type: 'button', onclick: (event) => copy(text, event.currentTarget) }, 'Copy'));

  // --- Selection tray: several components in one install command.
  function toggleSelected(item) {
    const key = `${item.kind}/${item.name}`;
    if (state.selection.has(key)) state.selection.delete(key);
    else state.selection.add(key);
    store.set('selection', [...state.selection].join(' '));
    renderTray();
    render();
  }

  function renderTray() {
    const tray = $('tray');
    const items = [...state.selection].map((key) => byKey.get(key));
    tray.hidden = items.length === 0;
    if (items.length === 0) return;
    const clear = () => { state.selection.clear(); store.set('selection', ''); renderTray(); render(); };
    tray.replaceChildren(
      h('span', { class: 'tray-label' }, `${plural(items.length, 'component')} selected`),
      commandBox(command(items.map((item) => item.ref))),
      h('button', { class: 'button small', type: 'button', onclick: clear }, 'Clear'));
  }

  // --- Cards
  function chips(item) {
    const count = (kind) => item.uses.filter((used) => used.kind === kind).length;
    const out = [];
    if (item.kind === 'stack') out.push(`installs ${plural(item.installs.length, 'piece')}`);
    if (item.kind === 'agent') out.push(item.category);
    if (['workflow', 'agent', 'skill'].includes(item.kind)) {
      const skills = count('skill') + count('workflow') + count('external');
      if (skills) out.push(plural(skills, 'skill'));
      if (count('agent')) out.push(plural(count('agent'), 'agent'));
    }
    const nodes = out.map((text) => h('span', { class: 'chip' }, text));
    if (item.tools?.length) nodes.push(h('span', { class: 'chip warn' }, `needs ${item.tools.join(', ')}`));
    if (item.license === 'none') nodes.push(h('span', { class: 'chip warn' }, 'no license'));
    return nodes;
  }

  // "follows a, b · dispatches x": the relations a card can show next to its counts.
  function relations(item) {
    const names = (kinds) => item.uses.filter((used) => kinds.includes(used.kind)).map((used) => used.name);
    const skills = names(['skill', 'workflow', 'external']);
    const agents = names(['agent']);
    const verb = { workflow: 'follows', agent: 'loads', skill: 'requires', stack: 'includes' }[item.kind];
    if (item.kind === 'stack') return `${verb} ${[...skills, ...agents].join(', ')}`;
    return [skills.length ? `${verb} ${skills.join(', ')}` : null, agents.length ? `dispatches ${agents.join(', ')}` : null].filter(Boolean).join(' · ');
  }

  function card(item) {
    const selected = state.selection.has(`${item.kind}/${item.name}`);
    return h('article', { class: `card k-${item.kind}` },
      h('div', { class: 'card-head' },
        icon(item.kind),
        h('div', {},
          h('h3', { class: 'card-title' }, h('a', { href: link(item) }, item.name)),
          h('p', { class: 'card-kind' }, item.kind))),
      h('p', { class: 'card-text' }, summary(item.description)),
      relations(item) ? h('p', { class: 'card-rel' }, relations(item)) : null,
      h('div', { class: 'card-foot' },
        chips(item),
        h('div', { class: 'card-actions' },
          h('button', { class: 'button small', type: 'button', 'aria-label': `Copy the install command for ${item.name}`, onclick: (event) => copy(command([item.ref]), event.currentTarget) }, 'Copy install'),
          h('button', { class: 'button small', type: 'button', 'aria-pressed': String(selected), title: 'Install several components with one command', 'aria-label': `${selected ? 'Remove' : 'Add'} ${item.name} ${selected ? 'from' : 'to'} the combined install command`, onclick: () => toggleSelected(item) }, selected ? 'Added' : '+ Add'))));
  }

  // --- Routing
  function parseRoute() {
    const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
    const parts = path.split('/').filter(Boolean);
    const params = new URLSearchParams(query);
    if (parts[0] === 'browse') {
      const kind = KINDS.find((entry) => entry.plural === parts[1]);
      return { view: 'browse', kind: kind?.id ?? null, query: params.get('q') ?? '', stack: params.get('stack') ?? '', sort: params.get('sort') === 'name' ? 'name' : 'kind' };
    }
    const item = parts.length === 2 ? byKey.get(`${parts[0]}/${parts[1]}`) : null;
    if (item) return { view: 'detail', item };
    return { view: 'home' };
  }

  function browseHash({ kind, query, stack, sort }) {
    const segment = KINDS.find((entry) => entry.id === kind)?.plural;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (stack) params.set('stack', stack);
    if (sort === 'name') params.set('sort', 'name');
    const suffix = params.toString();
    return `#/browse${segment ? `/${segment}` : ''}${suffix ? `?${suffix}` : ''}`;
  }

  // --- Browse
  function matches(item, route) {
    if (route.kind && item.kind !== route.kind) return false;
    if (route.stack) {
      const stack = byKey.get(`stack/${route.stack}`);
      const inStack = stack && (item === stack || stack.installs.some((other) => other.kind === item.kind && other.name === item.name));
      if (!inStack) return false;
    }
    const words = route.query.toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = [item.name, item.kind, item.description, item.category, ...(item.tags ?? [])].join(' ').toLowerCase();
    return words.every((word) => haystack.includes(word));
  }

  function renderBrowse(route) {
    const view = $('view-browse');
    const results = DATA.items.filter((item) => matches(item, route));
    const kind = KINDS.find((entry) => entry.id === route.kind);
    const stackSelect = h('select', { 'aria-label': 'Show the pieces of one stack', onchange: (event) => { location.hash = browseHash({ ...route, stack: event.target.value }); } },
      h('option', { value: '' }, 'Any stack'),
      DATA.items.filter((item) => item.kind === 'stack').map((stack) => h('option', { value: stack.name, selected: stack.name === route.stack }, `In ${stack.name}`)));

    const sortSelect = h('select', { 'aria-label': 'Sort', onchange: (event) => { location.hash = browseHash({ ...route, sort: event.target.value }); } },
      h('option', { value: 'kind', selected: route.sort === 'kind' }, 'Grouped by kind'),
      h('option', { value: 'name', selected: route.sort === 'name' }, 'A to Z'));

    const pills = h('nav', { class: 'pills', 'aria-label': 'Kinds' },
      h('a', { class: 'pill', href: browseHash({ ...route, kind: null }), 'aria-current': route.kind ? null : 'page' }, 'All'),
      KINDS.map((entry) => h('a', { class: `pill k-${entry.id}`, href: browseHash({ ...route, kind: entry.id }), 'aria-current': route.kind === entry.id ? 'page' : null }, entry.label)));

    const head = h('div', { class: 'browse-head' },
      h('h1', {}, kind ? kind.label : 'Everything'),
      h('span', { class: 'browse-count' }, plural(results.length, 'component')),
      h('div', { class: 'browse-tools' }, stackSelect, sortSelect));

    const byName = [...results].sort((a, b) => a.name.localeCompare(b.name));
    const groups = route.sort === 'name' ? [h('div', { class: 'grid' }, byName.map(card))] : KINDS.filter((entry) => results.some((item) => item.kind === entry.id)).flatMap((entry) => [
      route.kind ? null : h('h2', { class: `group-title k-${entry.id}` }, `${entry.label} (${results.filter((item) => item.kind === entry.id).length})`),
      h('div', { class: 'grid' }, results.filter((item) => item.kind === entry.id).map(card)),
    ]).filter(Boolean);

    const empty = h('div', { class: 'empty' },
      h('b', {}, 'Nothing matches'),
      route.query ? `No component mentions "${route.query}". ` : 'No component fits these filters. ',
      h('a', { href: '#/browse' }, 'Show everything'));

    view.replaceChildren(pills, head, ...(results.length ? groups : [empty]));
  }

  // --- Detail
  const refChip = (ref) => h('a', { class: `ref k-${ref.kind}`, href: link(ref), title: ref.kind }, h('i', {}), ref.name);

  function refGroups(refs) {
    return KINDS.filter((entry) => refs.some((ref) => ref.kind === entry.id)).flatMap((entry) => [
      h('p', { class: 'sub-label' }, entry.label),
      h('div', { class: 'links' }, refs.filter((ref) => ref.kind === entry.id).map(refChip)),
    ]);
  }

  function installPanel(item) {
    const target = harness();
    const notes = [];
    if (target.skills) notes.push(h('p', { class: 'hint' }, 'Run it from the root of your project. Skills go to ', h('code', {}, `${target.skills}/`), target.agents ? [' and agents to ', h('code', {}, `${target.agents}/`)] : null, '.'));
    else notes.push(h('p', { class: 'hint' }, `${target.label} keeps skills per user, so this installs to `, h('code', {}, `~/${target.globalSkills}/`), '.'));
    const agents = item.kind === 'agent' || item.installs.some((other) => other.kind === 'agent');
    if (agents && !target.supportsAgents) notes.push(h('p', { class: 'hint warn' }, `${target.label} has no agent files: agents are created in the app, so only the skills are installed.`));
    if (item.kind === 'external' || item.installs.some((other) => other.kind === 'external')) notes.push(h('p', { class: 'hint' }, 'Externals are cloned with git from their own repository, at a pinned commit.'));

    const plugin = item.kind !== 'stack' ? [] : [
      h('p', { class: 'sub-label' }, 'Or as a Claude Code plugin (no externals)'),
      commandBox(`/plugin marketplace add ${DATA.repository}`, true),
      h('div', { style: 'height:0.4rem' }),
      commandBox(`/plugin install ${item.name}@${DATA.name}`, true),
    ];
    return h('section', { class: 'panel' }, h('h2', {}, `Install for ${target.label}`), commandBox(command([item.ref])), notes, plugin);
  }

  const sourceUrl = (item) => `https://github.com/${DATA.repository}/${item.kind === 'skill' || item.kind === 'workflow' ? 'tree' : 'blob'}/main/${item.path}`;

  function factsPanel(item) {
    const source = sourceUrl(item);
    const rows = [
      ['Version', item.version],
      item.category ? ['Category', item.category] : null,
      item.license ? ['License', item.license === 'none' ? 'None: the source repository has no license file' : item.license] : null,
      item.tools?.length ? ['Needs', item.tools.join(', ')] : null,
      item.compatibility ? ['Compatibility', item.compatibility] : null,
      item.commit ? ['Pinned commit', item.commit.slice(0, 12)] : null,
      item.repo ? ['Repository', h('a', { href: item.repo }, item.repo.replace('https://github.com/', ''))] : null,
      item.source ? ['Adapted from', h('a', { href: item.source }, item.source.replace('https://github.com/', ''))] : null,
      item.notes ? ['Notes', item.notes] : null,
      ['Source', h('a', { href: source }, item.path)],
    ].filter(Boolean);
    return h('section', { class: 'panel' }, h('h2', {}, 'Details'),
      h('dl', { class: 'facts' }, rows.flatMap(([term, value]) => [h('dt', {}, term), h('dd', {}, value)])),
      item.files?.length ? [h('p', { class: 'sub-label' }, plural(item.files.length, 'file')), h('div', { class: 'files' }, item.files.map((file) => h('div', {}, file)))] : null);
  }

  // Most descriptions say what the component does, then when to use it. Show them as two paragraphs.
  function describe(text) {
    const match = text.match(/^(.+?[.!?])\s+((?:Use|Trigger|Invoke|Do NOT)\b.+)$/s);
    return (match ? [match[1], match[2]] : [text]).map((part) => h('p', {}, part));
  }

  // The component's own instructions, fetched when its page opens. Opened from disk there is nothing to fetch, so link to the source.
  function contentPanel(item) {
    if (!['skill', 'workflow', 'agent'].includes(item.kind)) return null;
    const title = item.kind === 'agent' ? 'The persona' : 'The instructions (SKILL.md)';
    const body = h('pre', { class: 'doc', tabindex: '0', 'aria-label': title }, 'Loading...');
    fetch(`content/${item.kind}/${item.name}.md`)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(response.status))))
      .then((text) => { body.textContent = text; })
      .catch(() => { body.replaceWith(h('p', { class: 'hint' }, 'Read it in the repository: ', h('a', { href: sourceUrl(item) }, item.path))); });
    return h('section', { class: 'panel' }, h('h2', {}, title), body);
  }

  function renderDetail(item) {
    const kind = KINDS.find((entry) => entry.id === item.kind);
    const selected = state.selection.has(`${item.kind}/${item.name}`);
    const left = [
      installPanel(item),
      item.installs.length ? h('section', { class: 'panel' }, h('h2', {}, item.kind === 'stack' ? `What is inside (${item.installs.length})` : `Installs with it (${item.installs.length})`), refGroups(item.installs)) : null,
      item.usedBy.length ? h('section', { class: 'panel' }, h('h2', {}, 'Used by'), refGroups(item.usedBy)) : null,
      contentPanel(item),
    ];
    $('view-detail').replaceChildren(
      h('p', { class: 'crumbs' }, h('a', { href: '#/browse' }, 'catalog'), ' / ', h('a', { href: browseHash({ kind: item.kind }) }, kind.plural), ' / ', item.name),
      h('div', { class: `detail-head k-${item.kind}` },
        icon(item.kind),
        h('div', {},
          h('h1', {}, item.name),
          h('div', { class: 'detail-meta' },
            h('span', { class: 'chip' }, item.kind), h('span', { class: 'chip' }, `v${item.version}`), chips(item),
            h('button', { class: 'button small', type: 'button', 'aria-pressed': String(selected), title: 'Install several components with one command', onclick: () => toggleSelected(item) }, selected ? 'Added to the command' : '+ Add to a combined command')))),
      h('div', { class: 'detail-desc' }, describe(item.description)),
      h('div', { class: 'detail-grid' }, h('div', {}, left), h('div', {}, factsPanel(item))));
  }

  // --- Home (static HTML; only the numbers and the logo come from the data)
  function renderHome() {
    $('logo').replaceChildren(...[0, 1, 2, 3, 4].flatMap((row) => [
      ...DATA.logo.map((letter) => h('span', { style: `color:${letter.color}` }, `${letter.rows[row]} `)), '\n',
    ]));
    $('stats').replaceChildren(
      ...KINDS.filter((kind) => countOf(kind.id)).map((kind) => h('a', { class: `stat k-${kind.id}`, href: browseHash({ kind: kind.id }), style: 'text-decoration:none' }, h('b', {}, String(countOf(kind.id))), h('span', {}, kind.plural))),
      h('div', { class: 'stat' }, h('b', {}, String(DATA.harnesses.length)), h('span', {}, 'harnesses')));
    $('hero-command').textContent = `npx github:${DATA.repository} list`;
    $('home-stacks').replaceChildren(...DATA.items.filter((item) => item.kind === 'stack').map(card));

    // One cell per skill or workflow: what is always in context is only a name and a description.
    const total = countOf('skill') + countOf('workflow');
    const step = Math.min(17, 720 / total);
    $('cells').replaceChildren(...Array.from({ length: total }, (_, index) => {
      const rect = document.createElementNS(SVG, 'rect');
      for (const [key, value] of Object.entries({ x: 220 + index * step, y: 30, width: step - 4, height: 30, rx: 3 })) rect.setAttribute(key, value);
      rect.setAttribute('class', index === Math.floor(total / 3) ? 'cell on' : 'cell');
      return rect;
    }));
  }

  function renderNav(route) {
    const current = (kind) => (route.view === 'browse' && route.kind === kind) || (route.view === 'detail' && route.item.kind === kind);
    $('nav-kinds').replaceChildren(
      h('li', {}, h('a', { href: '#/browse', 'aria-current': route.view === 'browse' && !route.kind ? 'page' : null }, h('span', { class: 'dot' }), 'Everything', h('span', { class: 'count' }, String(DATA.items.length)))),
      ...KINDS.map((kind) => h('li', {}, h('a', { class: `k-${kind.id}`, href: browseHash({ kind: kind.id }), 'aria-current': current(kind.id) ? 'page' : null }, h('span', { class: 'dot' }), kind.label, h('span', { class: 'count' }, String(countOf(kind.id)))))));
    const home = document.querySelector('[data-route="home"]');
    if (route.view === 'home') home.setAttribute('aria-current', 'page');
    else home.removeAttribute('aria-current');
  }

  function render() {
    const route = parseRoute();
    for (const view of ['home', 'browse', 'detail']) $(`view-${view}`).hidden = route.view !== view;
    renderNav(route);
    if (route.view === 'home') renderHome();
    if (route.view === 'browse') renderBrowse(route);
    if (route.view === 'detail') renderDetail(route.item);
    if (route.view !== 'browse' && document.activeElement !== $('search')) $('search').value = '';
    document.title = route.view === 'detail' ? `${route.item.name} · Aiuda Labs Marketplace` : 'Aiuda Labs Marketplace';
  }

  // --- Wiring
  $('harness').append(...DATA.harnesses.map((entry) => h('option', { value: entry.id, selected: entry.id === state.harness }, entry.label)));
  $('harness').addEventListener('change', (event) => { state.harness = event.target.value; store.set('harness', state.harness); renderTray(); render(); });

  $('search').addEventListener('input', (event) => {
    const route = parseRoute();
    const next = browseHash({ ...(route.view === 'browse' ? route : {}), query: event.target.value });
    // Typing replaces the entry, so Back leaves the search in one step.
    history.replaceState(null, '', next);
    render();
  });
  document.addEventListener('keydown', (event) => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if ((event.key === '/' && !typing) || (event.key === 'k' && (event.metaKey || event.ctrlKey))) { event.preventDefault(); $('search').focus(); }
    if (event.key === 'Escape' && document.activeElement === $('search')) $('search').blur();
  });

  $('theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('theme', next);
  });

  // The sidebar is a drawer on narrow screens.
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    $('menu').setAttribute('aria-expanded', String(open));
  }
  $('menu').addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $('scrim').addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-copy-from]');
    if (button) copy($(button.dataset.copyFrom).textContent, button);
  });

  $('link-github').href = `https://github.com/${DATA.repository}`;
  $('link-contribute').href = `https://github.com/${DATA.repository}/blob/main/CONTRIBUTING.md`;
  $('version').textContent = `v${DATA.version}`;
  $('footer-name').textContent = DATA.name;

  window.addEventListener('hashchange', () => { setMenu(false); render(); if (!location.hash.includes('how')) window.scrollTo(0, 0); });
  const initial = parseRoute();
  if (initial.view === 'browse') $('search').value = initial.query;
  renderTray();
  render();
})();
