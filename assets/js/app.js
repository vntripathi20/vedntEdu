/* vedntEdu — hash-routed single page app. No dependencies. */
(() => {
  'use strict';

  /* ---------- Departments ---------- */

  const DEPTS = {
    KIN: { name: 'Kinematics', desc: 'Motion under acceleration. Bikes, cars and trucks, none of which obey traffic law.' },
    MEC: { name: 'Applied Mechanics', desc: 'Jumps, swings and precise timing. Labs are graded pass/fail, mostly fail.' },
    COL: { name: 'Collaborative Studies', desc: 'Two-person coursework on one keyboard. Disputes go to office hours.' },
    PE:  { name: 'Physical Education', desc: 'Fulfils the athletics requirement without leaving your chair.' },
    LOG: { name: 'Logic & Reasoning', desc: 'Puzzles, number problems and pattern work. Show your working.' },
    STR: { name: 'Strategy & Game Theory', desc: 'Board games, card games and resource management under pressure.' },
    NET: { name: 'Networked Systems', desc: 'Live multiplayer arenas. Expect peer review from strangers.' },
    BAL: { name: 'Applied Ballistics', desc: 'Trajectories, targets and reaction time. Safety goggles optional.' },
    ARC: { name: 'Arcade Studies', desc: 'Short sessions and high scores. Fits neatly between bells.' },
  };
  const DEPT_ORDER = ['KIN', 'MEC', 'COL', 'PE', 'NET', 'LOG', 'STR', 'BAL', 'ARC'];
  const FORMAT = { COL: 'Two players, one keyboard', NET: 'Online multiplayer' };

  /* ---------- Catalog: assign course numbers ---------- */

  // Level comes from popularity: 1xx intro (most enrolled), 2xx, 3xx electives.
  const courses = (window.CATALOG || []).slice();
  const byDept = {};
  for (const c of courses) (byDept[c.dept] = byDept[c.dept] || []).push(c);
  for (const dept of Object.keys(byDept)) {
    const list = byDept[dept];
    list.sort((a, b) => b.pop - a.pop || a.title.localeCompare(b.title));
    const seq = {};
    for (const c of list) {
      const level = 4 - c.pop;
      seq[level] = (seq[level] || 0) + 1;
      c.num = level * 100 + seq[level];
      c.code = `${dept} ${c.num}`;
    }
  }
  const bySlug = new Map(courses.map(c => [c.slug, c]));

  /* ---------- Storage (fails soft in private windows) ---------- */

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('vedu.' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('vedu.' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  const prefs = Object.assign({
    theme: 'system',
    disguise: 'off',
    customTitle: '',
    panicKey: '`',
    panicUrl: '',
  }, store.get('prefs', {}));
  const savePrefs = () => store.set('prefs', prefs);

  let enrolled = new Set(store.get('enrolled', []));
  let recent = store.get('recent', []); // [{ slug, t }]

  const toggleEnrolled = slug => {
    enrolled.has(slug) ? enrolled.delete(slug) : enrolled.add(slug);
    store.set('enrolled', [...enrolled]);
    return enrolled.has(slug);
  };
  const markPlayed = slug => {
    recent = [{ slug, t: Date.now() }, ...recent.filter(r => r.slug !== slug)].slice(0, 16);
    store.set('recent', recent);
  };

  /* ---------- Helpers ---------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const main = $('#main');
  const searchInput = $('#search');

  const esc = s => String(s).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
  const thumb = c => `assets/thumbs/${c.slug}.jpg`;
  const gameSrc = c => {
    const base = `https://html5.gamedistribution.com/${c.id}/`;
    if (location.protocol === 'file:') return base;
    return base + '?gd_sdk_referrer_url=' + encodeURIComponent(location.origin + location.pathname);
  };

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const ago = t => {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    const d = Math.round(h / 24);
    return d === 1 ? 'yesterday' : `${d} days ago`;
  };

  let toastTimer;
  const toast = msg => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  };

  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
    full: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    reload: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.5h-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.8l2.2 4.6 5 .6-3.7 3.5.9 5-4.4-2.4-4.4 2.4.9-5L2.8 8l5-.6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    starOn: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.8l2.2 4.6 5 .6-3.7 3.5.9 5-4.4-2.4-4.4 2.4.9-5L2.8 8l5-.6z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    out: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 3h6v6M17 3l-8 8M14 12v5H3V6h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    hide: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h7l3 3v11H5z M12 3v3h3 M8 10h4M8 13h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  };

  /* ---------- Shared fragments ---------- */

  const card = c => `
    <a class="card" href="#/course/${c.slug}">
      <div class="card-media">
        <img src="${thumb(c)}" alt="" loading="lazy" width="512" height="384">
        ${enrolled.has(c.slug) ? '<span class="card-flag">Enrolled</span>' : ''}
      </div>
      <div class="card-body">
        <span class="code">${c.code}</span>
        <h3 class="card-title">${esc(c.title)}</h3>
        <p class="card-dept">${DEPTS[c.dept].name}</p>
      </div>
    </a>`;

  const rankedItem = c => `
    <li><a href="#/course/${c.slug}">
      <img src="${thumb(c)}" alt="" loading="lazy" width="64" height="48">
      <span><span class="r-title">${esc(c.title)}</span><span class="r-dept">${c.code} · ${DEPTS[c.dept].name}</span></span>
    </a></li>`;

  /* ---------- Pages ---------- */

  function pageHome() {
    const popular = courses.filter(c => c.pop === 3)
      .sort((a, b) => a.title.localeCompare(b.title));
    // Rotate the spotlight once a day so the front page isn't static.
    const day = Math.floor(Date.now() / 864e5);
    const feature = popular[day % popular.length];
    const ranked = popular.filter(c => c !== feature)
      .sort((a, b) => ((a.num * 7 + day) % 13) - ((b.num * 7 + day) % 13))
      .slice(0, 7);

    const resume = recent.map(r => bySlug.get(r.slug)).filter(Boolean).slice(0, 6);

    return `
      <div class="page"><div class="wrap">
        <div class="home-head">
          <div>
            <p class="eyebrow">${termName()} · Course Catalog</p>
            <h1 class="page-title">${plural(courses.length, 'course')}, nine departments, no prerequisites.</h1>
            <p class="page-lead">Interactive modules for independent study. Open any course to begin; your progress and enrollments stay on this device.</p>
          </div>
          <aside class="notice">
            <strong>Registrar's notice</strong>
            <p>Press <kbd>${esc(keyLabel(prefs.panicKey))}</kbd> at any time to switch to your study notes. Click outside the game first so the key reaches this page.</p>
            <p>Tab disguises and other settings are under <a href="#/preferences">Preferences</a>.</p>
          </aside>
        </div>

        ${resume.length ? `
        <section class="section">
          <div class="section-head">
            <h2 class="section-title">Continue studying</h2>
            <span class="section-meta">Recently opened</span>
            <a class="section-link" href="#/schedule">Attendance record →</a>
          </div>
          <div class="rail">${resume.map(card).join('')}</div>
        </section>` : ''}

        <section class="section">
          <div class="section-head">
            <h2 class="section-title">Most enrolled this term</h2>
            <a class="section-link" href="#/courses">Full catalog →</a>
          </div>
          <div class="spotlight">
            <a class="feature" href="#/course/${feature.slug}">
              <div class="feature-media"><img src="${thumb(feature)}" alt="" width="512" height="384"></div>
              <div class="feature-body">
                <span class="code">${feature.code} · ${DEPTS[feature.dept].name}</span>
                <h3 class="feature-title">${esc(feature.title)}</h3>
                <p class="feature-blurb">${esc(feature.blurb)}</p>
              </div>
            </a>
            <ol class="ranked">${ranked.map(rankedItem).join('')}</ol>
          </div>
        </section>

        ${DEPT_ORDER.map(d => {
          const list = byDept[d] || [];
          return `
          <section class="section">
            <div class="dept-head">
              <span class="dept-code">${d}</span>
              <h2 class="section-title">${DEPTS[d].name}</h2>
              <a class="section-link" href="#/courses/${d}">All ${list.length} courses →</a>
              <p class="dept-desc">${DEPTS[d].desc}</p>
            </div>
            <div class="grid grid-6">${list.slice(0, 6).map(card).join('')}</div>
          </section>`;
        }).join('')}
      </div></div>`;
  }

  function searchScore(c, q) {
    const title = c.title.toLowerCase();
    const hay = [title, c.code.toLowerCase(), DEPTS[c.dept].name.toLowerCase(), c.tags.join(' ').toLowerCase()].join(' ');
    const words = q.split(/\s+/).filter(Boolean);
    if (!words.every(w => hay.includes(w))) return -1;
    if (title.startsWith(q)) return 3;
    if (title.includes(q)) return 2;
    return 1;
  }

  function pageCatalog(dept, params) {
    if (dept && !DEPTS[dept]) return pageNotFound();
    const q = (params.get('q') || '').trim().toLowerCase();
    const sort = params.get('sort') || 'popular';

    let list = dept ? byDept[dept].slice() : courses.slice();
    if (q) list = list.map(c => [c, searchScore(c, q)]).filter(([, s]) => s >= 0)
      .sort((a, b) => b[1] - a[1]).map(([c]) => c);
    if (!q || sort !== 'popular') {
      const cmp = {
        popular: (a, b) => b.pop - a.pop || a.dept.localeCompare(b.dept) || a.num - b.num,
        number: (a, b) => DEPT_ORDER.indexOf(a.dept) - DEPT_ORDER.indexOf(b.dept) || a.num - b.num,
        az: (a, b) => a.title.localeCompare(b.title),
      }[sort] || (() => 0);
      list.sort(cmp);
    }

    const qs = (overrides) => {
      const p = new URLSearchParams(params);
      for (const [k, v] of Object.entries(overrides)) v ? p.set(k, v) : p.delete(k);
      const s = p.toString();
      return s ? '?' + s : '';
    };
    const deptLink = d => `#/courses${d ? '/' + d : ''}${qs({})}`;

    return `
      <div class="page"><div class="wrap">
        <p class="eyebrow">${dept ? `Department of ${DEPTS[dept].name}` : `${termName()} · Course Catalog`}</p>
        <h1 class="page-title">${dept ? DEPTS[dept].name : 'All courses'}</h1>
        <p class="page-lead">${dept ? DEPTS[dept].desc : 'Every module currently offered, across all departments. Filter by department or search by title, course number or topic.'}</p>

        <div class="catalog">
          <aside class="filters">
            <h2>Departments</h2>
            <ul class="dept-list">
              <li><a href="${deptLink('')}" ${!dept ? 'aria-current="true"' : ''}><span class="code">ALL</span><span class="d-name">All departments</span><span class="count">${courses.length}</span></a></li>
              ${DEPT_ORDER.map(d => `
                <li><a href="${deptLink(d)}" ${d === dept ? 'aria-current="true"' : ''}>
                  <span class="code">${d}</span><span class="d-name">${DEPTS[d].name}</span><span class="count">${byDept[d].length}</span>
                </a></li>`).join('')}
            </ul>
          </aside>

          <div>
            <div class="toolbar">
              <p class="result-count">${q
                ? `${plural(list.length, 'result')} for <mark>${esc(params.get('q').trim())}</mark>${dept ? ` in ${DEPTS[dept].name}` : ''}`
                : `Showing ${plural(list.length, 'course')}`}</p>
              <label class="sort">Sort by
                <select id="sort">
                  <option value="popular" ${sort === 'popular' ? 'selected' : ''}>${q ? 'Best match' : 'Most enrolled'}</option>
                  <option value="number" ${sort === 'number' ? 'selected' : ''}>Course number</option>
                  <option value="az" ${sort === 'az' ? 'selected' : ''}>Title, A–Z</option>
                </select>
              </label>
            </div>
            ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : `
              <div class="empty">
                <h3>No courses match that search.</h3>
                <p>Try a shorter title, a department code like <a href="#/courses?q=KIN">KIN</a>, or a topic such as <a href="#/courses?q=racing">racing</a>. ${dept ? `You can also <a href="#/courses${qs({})}">search every department</a>.` : ''}</p>
              </div>`}
          </div>
        </div>
      </div></div>`;
  }

  function pageDepartments() {
    return `
      <div class="page"><div class="wrap">
        <p class="eyebrow">${termName()} · Academic Departments</p>
        <h1 class="page-title">Departments</h1>
        <p class="page-lead">Nine departments, each with introductory (100-level) courses for newcomers and electives further up the numbering.</p>
        <table class="dept-table">
          <thead><tr><th>Code</th><th>Department</th><th>Courses</th><th class="t-top">Most enrolled</th></tr></thead>
          <tbody>
            ${DEPT_ORDER.map(d => `
              <tr>
                <td><span class="dept-code">${d}</span></td>
                <td class="t-name"><a href="#/courses/${d}">${DEPTS[d].name}</a><p class="t-desc">${DEPTS[d].desc}</p></td>
                <td class="t-num">${byDept[d].length}</td>
                <td class="t-top">${byDept[d].slice(0, 3).map(c => `<a href="#/course/${c.slug}">${esc(c.title)}</a>`).join(', ')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div></div>`;
  }

  function pageCourse(slug) {
    const c = bySlug.get(slug);
    if (!c) return pageNotFound();
    const d = DEPTS[c.dept];
    const related = byDept[c.dept].filter(x => x !== c).slice(0, 5);
    const ar = `${c.w} / ${c.h}`;
    const isOn = enrolled.has(c.slug);

    return `
      <div class="page"><div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="#/courses">Catalog</a><span aria-hidden="true">/</span>
          <a href="#/courses/${c.dept}">${d.name}</a><span aria-hidden="true">/</span>
          <span>${c.code}</span>
        </nav>
        <div class="course-head">
          <div>
            <span class="code">${c.code} · ${d.name}</span>
            <h1 class="page-title">${esc(c.title)}</h1>
          </div>
        </div>

        <div class="stage-wrap">
          <div class="stage" id="stage" style="--ar:${ar};--arn:${(c.w / c.h).toFixed(4)}">
            <button class="poster" id="start" type="button">
              <img src="${thumb(c)}" alt="">
              <span class="poster-inner">
                <span class="poster-play">${ICON.play}</span>
                <span class="poster-label">Begin module</span>
                <span class="poster-sub">Publisher may show a short sponsor message first</span>
              </span>
            </button>
          </div>
        </div>

        <div class="stage-bar">
          <button class="btn" type="button" data-act="full">${ICON.full}Full screen</button>
          <button class="btn btn-quiet" type="button" data-act="reload">${ICON.reload}Restart</button>
          <button class="btn" type="button" data-act="enroll" aria-pressed="${isOn}">${isOn ? ICON.starOn + 'Enrolled' : ICON.star + 'Enroll'}</button>
          <button class="btn btn-quiet" type="button" data-act="popout" title="Open in a blank tab that doesn't show this site's address">${ICON.out}Open in blank tab</button>
          <span class="spacer"></span>
          <span class="hint">Panic key <kbd>${esc(keyLabel(prefs.panicKey))}</kbd></span>
          <button class="btn btn-quiet" type="button" data-act="panic">${ICON.hide}Study notes</button>
        </div>

        <div class="course-body">
          <div class="syllabus">
            <section>
              <h2>Course description</h2>
              <p>${esc(c.blurb || 'No description supplied by the publisher.')}</p>
            </section>
            ${c.controls.length ? `
            <section>
              <h2>Lab procedure</h2>
              <ol class="procedure">${c.controls.map(l => `<li>${esc(l)}</li>`).join('')}</ol>
            </section>` : ''}
            ${c.tags.length ? `
            <section>
              <h2>Topics covered</h2>
              <div class="topics">${c.tags.map(t => `<a href="#/courses?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>
            </section>` : ''}
          </div>

          <aside>
            <section class="related">
              <h2>Course details</h2>
              <dl class="facts">
                <dt>Number</dt><dd>${c.code}</dd>
                <dt>Department</dt><dd><a href="#/courses/${c.dept}">${d.name}</a></dd>
                <dt>Format</dt><dd>${FORMAT[c.dept] || 'Self-paced'}</dd>
                <dt>Level</dt><dd>${['Introductory', 'Intermediate', 'Elective'][Math.floor(c.num / 100) - 1]}</dd>
                <dt>Credits</dt><dd>${(c.pop + 1).toFixed(1)}</dd>
              </dl>
            </section>
            <section class="related">
              <h2>Also in ${d.name}</h2>
              <ol class="ranked">${related.map(rankedItem).join('')}</ol>
            </section>
          </aside>
        </div>
      </div></div>`;
  }

  function bindCourse(slug) {
    const c = bySlug.get(slug);
    if (!c) return;
    const stage = $('#stage');
    const start = () => {
      if (stage.querySelector('iframe')) return;
      const f = document.createElement('iframe');
      f.src = gameSrc(c);
      f.title = c.title;
      f.allow = 'autoplay; fullscreen; gamepad; clipboard-write';
      f.allowFullscreen = true;
      f.setAttribute('scrolling', 'no');
      stage.replaceChildren(f);
      f.focus();
      markPlayed(c.slug);
    };
    $('#start').addEventListener('click', start);

    main.querySelector('.stage-bar').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'full') {
        start();
        const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
        if (req) req.call(stage); else toast('Full screen isn’t available in this browser.');
      } else if (act === 'reload') {
        const f = stage.querySelector('iframe');
        if (f) { f.src = 'about:blank'; setTimeout(() => { f.src = gameSrc(c); }, 30); } else start();
      } else if (act === 'enroll') {
        const on = toggleEnrolled(c.slug);
        btn.setAttribute('aria-pressed', on);
        btn.innerHTML = on ? ICON.starOn + 'Enrolled' : ICON.star + 'Enroll';
        toast(on ? `Enrolled in ${c.code}. It’s on your schedule.` : `Dropped ${c.code}.`);
      } else if (act === 'popout') {
        openBlank(gameSrc(c), c.title);
        markPlayed(c.slug);
      } else if (act === 'panic') {
        panic();
      }
    });
  }

  function pageSchedule() {
    const mine = courses.filter(c => enrolled.has(c.slug));
    const hist = recent.map(r => ({ ...r, c: bySlug.get(r.slug) })).filter(r => r.c);
    return `
      <div class="page"><div class="wrap">
        <p class="eyebrow">${termName()} · Student Record</p>
        <h1 class="page-title">My Schedule</h1>
        <p class="page-lead">Courses you’ve enrolled in and your recent attendance. This record is stored in this browser only.</p>

        <section class="section">
          <div class="section-head">
            <h2 class="section-title">Enrolled courses</h2>
            <span class="section-meta">${plural(mine.length, 'course')}</span>
          </div>
          ${mine.length ? `<div class="grid">${mine.map(card).join('')}</div>` : `
            <div class="empty">
              <h3>You haven’t enrolled in anything yet.</h3>
              <p>Open a course and choose <strong>Enroll</strong> to keep it here. The <a href="#/courses">full catalog</a> is a good place to start.</p>
            </div>`}
        </section>

        <section class="section">
          <div class="section-head">
            <h2 class="section-title">Attendance record</h2>
            <span class="section-meta">${plural(hist.length, 'session')}</span>
            ${hist.length ? '<button class="btn btn-quiet section-link" type="button" id="clear-history">Clear record</button>' : ''}
          </div>
          ${hist.length ? `<ul class="history">${hist.map(r => `
            <li>
              <img src="${thumb(r.c)}" alt="" loading="lazy">
              <div><a href="#/course/${r.c.slug}">${esc(r.c.title)}</a><div class="card-dept">${r.c.code} · ${DEPTS[r.c.dept].name}</div></div>
              <span class="when">${ago(r.t)}</span>
            </li>`).join('')}</ul>` : '<p class="empty">No sessions recorded yet.</p>'}
        </section>
      </div></div>`;
  }

  function bindSchedule() {
    const btn = $('#clear-history');
    if (btn) btn.addEventListener('click', () => {
      recent = [];
      store.set('recent', recent);
      render();
      toast('Attendance record cleared.');
    });
  }

  /* ---------- Tab disguise ---------- */

  const svgIcon = (body, bg) => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="5" y="2" width="22" height="28" rx="3" fill="${bg}"/>${body}</svg>`);
  const lines = '<path d="M10 11h12M10 15h12M10 19h12M10 23h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
  const DISGUISES = {
    off:        { label: 'Off', sub: 'Show vedntEdu as normal' },
    doc:        { label: 'Untitled document', sub: 'Blank word-processor tab', title: 'Untitled document', icon: svgIcon(lines, '#3b74d9') },
    notes:      { label: 'Unit 4 Review – Notes', sub: 'Class notes', title: 'Unit 4 Review – Notes', icon: svgIcon(lines, '#d9a21b') },
    assignment: { label: 'Assignment: Lab Report', sub: 'Assignment page', title: 'Assignment: Lab Report', icon: svgIcon('<path d="M10 17l4 4 8-9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>', '#2f8a5b') },
    sheet:      { label: 'Gradebook', sub: 'Spreadsheet tab', title: 'Gradebook – Period 3', icon: svgIcon('<path d="M9 10h14v14H9zM9 15h14M9 20h14M15 10v14" fill="none" stroke="#fff" stroke-width="1.6"/>', '#1f8a4c') },
    custom:     { label: 'Custom title', sub: 'Write your own', icon: svgIcon(lines, '#6b6f78') },
  };

  function applyTab(routeTitle) {
    const d = DISGUISES[prefs.disguise];
    const fav = $('#favicon');
    if (d && d.icon) {
      document.title = prefs.disguise === 'custom' ? (prefs.customTitle || 'Untitled') : d.title;
      fav.href = d.icon;
    } else {
      document.title = routeTitle ? `${routeTitle} · vedntEdu` : 'vedntEdu · Course Catalog';
      fav.href = 'assets/img/favicon.svg';
    }
  }

  /* ---------- Panic ---------- */

  const keyLabel = k => ({ ' ': 'Space', Escape: 'Esc' }[k] || (k.length === 1 ? k.toUpperCase() : k));

  function panic() {
    const url = prefs.panicUrl;
    if (url && /^https?:\/\//i.test(url)) location.replace(url);
    else location.replace('#/lesson');
  }

  function openBlank(src, title) {
    const w = window.open('about:blank', '_blank');
    if (!w) { toast('Your browser blocked the new tab. Allow pop-ups for this site and try again.'); return; }
    const doc = w.document;
    doc.title = title || 'Untitled document';
    const s = doc.body.style;
    s.margin = '0'; s.height = '100vh'; s.background = '#000';
    doc.documentElement.style.height = '100%';
    const f = doc.createElement('iframe');
    f.src = src;
    f.allow = 'autoplay; fullscreen; gamepad; clipboard-write';
    f.allowFullscreen = true;
    f.style.cssText = 'border:0;width:100%;height:100%;display:block';
    doc.body.appendChild(f);
  }

  /* ---------- Preferences ---------- */

  function pagePreferences() {
    return `
      <div class="page"><div class="wrap">
        <p class="eyebrow">Student Account</p>
        <h1 class="page-title">Preferences</h1>
        <p class="page-lead">Settings are saved in this browser and apply on every page.</p>

        <div class="pref-group">
          <div>
            <h2>Tab disguise</h2>
            <p class="pref-help">Changes the tab’s title and icon so it reads as ordinary schoolwork.</p>
          </div>
          <div>
            <div class="choices" id="disguise">
              ${Object.entries(DISGUISES).map(([k, d]) => `
                <label class="choice">
                  <input type="radio" name="disguise" value="${k}" ${prefs.disguise === k ? 'checked' : ''}>
                  ${d.icon ? `<img src="${d.icon}" alt="">` : '<img src="assets/img/favicon.svg" alt="">'}
                  <span><span class="choice-title">${esc(d.label)}</span><span class="choice-sub">${d.sub}</span></span>
                </label>`).join('')}
            </div>
            <div class="field" id="custom-field" ${prefs.disguise === 'custom' ? '' : 'hidden'}>
              <label for="custom-title">Custom tab title</label>
              <input type="text" id="custom-title" maxlength="80" value="${esc(prefs.customTitle)}" placeholder="e.g. Chapter 7 Vocabulary">
            </div>
          </div>
        </div>

        <div class="pref-group">
          <div>
            <h2>Panic key</h2>
            <p class="pref-help">One key press leaves the current page for your study notes or any address you choose. It only works while this page has focus, not the game itself.</p>
          </div>
          <div>
            <div class="row">
              <button class="btn keycap-btn" type="button" id="panic-key">${esc(keyLabel(prefs.panicKey))}</button>
              <span class="pref-help" id="panic-key-help">Select, then press the key you want to use.</span>
            </div>
            <div class="field">
              <label for="panic-url">Destination (leave blank for vedntEdu study notes)</label>
              <input type="url" id="panic-url" value="${esc(prefs.panicUrl)}" placeholder="https://">
            </div>
            <div class="row" style="margin-top:14px">
              <button class="btn" type="button" id="panic-test">Try it now</button>
            </div>
          </div>
        </div>

        <div class="pref-group">
          <div>
            <h2>Blank-tab mode</h2>
            <p class="pref-help">Opens vedntEdu inside an about:blank tab, so the address bar and history show nothing useful.</p>
          </div>
          <div class="row">
            <button class="btn btn-primary" type="button" id="open-blank">${ICON.out}Open in blank tab</button>
          </div>
        </div>

        <div class="pref-group">
          <div>
            <h2>Appearance</h2>
            <p class="pref-help">Follow your device, or pick one.</p>
          </div>
          <div>
            <div class="segmented" id="theme" role="group" aria-label="Theme">
              ${['system', 'light', 'dark'].map(t => `<button type="button" data-theme="${t}" aria-pressed="${prefs.theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="pref-group">
          <div>
            <h2>Reset</h2>
            <p class="pref-help">Clears enrollments, attendance and these preferences from this browser.</p>
          </div>
          <div class="row">
            <button class="btn" type="button" id="reset">Reset everything</button>
          </div>
        </div>
      </div></div>`;
  }

  function bindPreferences() {
    $('#disguise').addEventListener('change', e => {
      prefs.disguise = e.target.value;
      savePrefs();
      $('#custom-field').hidden = prefs.disguise !== 'custom';
      applyTab('Preferences');
      if (prefs.disguise === 'custom') $('#custom-title').focus();
    });
    $('#custom-title').addEventListener('input', e => {
      prefs.customTitle = e.target.value;
      savePrefs();
      applyTab('Preferences');
    });

    const keyBtn = $('#panic-key');
    keyBtn.addEventListener('click', () => {
      keyBtn.classList.add('listening');
      keyBtn.textContent = 'Press a key…';
      const onKey = e => {
        e.preventDefault();
        e.stopPropagation();
        if (!['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) {
          prefs.panicKey = e.key;
          savePrefs();
          syncPanicHints();
        }
        keyBtn.classList.remove('listening');
        keyBtn.textContent = keyLabel(prefs.panicKey);
        window.removeEventListener('keydown', onKey, true);
      };
      window.addEventListener('keydown', onKey, true);
    });

    $('#panic-url').addEventListener('change', e => {
      const v = e.target.value.trim();
      if (v && !/^https?:\/\//i.test(v)) { toast('Use a full address starting with https://'); return; }
      prefs.panicUrl = v;
      savePrefs();
      toast(v ? 'Panic destination saved.' : 'Panic key will open study notes.');
    });
    $('#panic-test').addEventListener('click', panic);
    $('#open-blank').addEventListener('click', () => openBlank(location.href.split('#')[0] + '#/', 'Untitled document'));

    $('#theme').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      prefs.theme = b.dataset.theme;
      savePrefs();
      applyTheme();
      $('#theme').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    });

    $('#reset').addEventListener('click', () => {
      try { Object.keys(localStorage).filter(k => k.startsWith('vedu.')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
      location.reload();
    });
  }

  function applyTheme() {
    const root = document.documentElement;
    if (prefs.theme === 'light' || prefs.theme === 'dark') root.dataset.theme = prefs.theme;
    else delete root.dataset.theme;
    store.set('theme', prefs.theme);
  }

  function syncPanicHints() {
    $('#panic-hint').textContent = keyLabel(prefs.panicKey);
  }

  /* ---------- Study notes (the panic destination) ---------- */

  function pageNotes() {
    const edited = new Date(Date.now() - 2 * 864e5).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `
      <div class="notes-bar"><div class="wrap notes-bar-inner">
        <a href="#/"><svg class="crest" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6" fill="currentColor"/><path d="M8 9.5h4.2l3.8 10.6 3.8-10.6H24L18 24h-4z" fill="var(--card)"/></svg>vedntEdu Notes</a>
        <span>/ Physics / Unit 4</span>
        <span class="saved">All changes saved</span>
      </div></div>
      <article class="sheet">
        <p class="eyebrow">PHY 201 · Unit 4 · Lesson 3</p>
        <h1>Projectile Motion</h1>
        <p class="byline">Class notes · Last edited ${edited}</p>

        <h2>Key ideas</h2>
        <ul>
          <li>A projectile moves under gravity alone once launched. We ignore air resistance unless told otherwise.</li>
          <li>Horizontal and vertical motion are <span class="hl">independent</span>. Treat them as two separate 1-D problems that share the same time <em>t</em>.</li>
          <li>Horizontal velocity stays constant (no horizontal force). Vertical velocity changes at <em>g</em> = 9.8 m/s² downward.</li>
          <li>At the top of the path the vertical velocity is zero, but the horizontal velocity is not.</li>
        </ul>

        <h2>Equations</h2>
        <p>Launch speed <em>v₀</em> at angle <em>θ</em> above horizontal:</p>
        <div class="eq">vₓ = v₀ cos θ            (constant)
vᵧ = v₀ sin θ − g t

x  = v₀ cos θ · t
y  = v₀ sin θ · t − ½ g t²</div>
        <p>For a launch and landing at the same height:</p>
        <div class="eq">Time of flight   T = 2 v₀ sin θ / g
Maximum height   H = v₀² sin² θ / (2g)
Range            R = v₀² sin 2θ / g</div>
        <p>Range is greatest at <span class="hl">θ = 45°</span>, and complementary angles (30° and 60°) give the same range.</p>

        <figure>
          <svg viewBox="0 0 600 220" role="img" aria-label="Parabolic trajectory with launch angle, maximum height and range labelled">
            <line x1="30" y1="190" x2="580" y2="190" stroke="currentColor" stroke-opacity=".5"/>
            <path d="M40 190 Q 300 -50 560 190" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
            <line x1="300" y1="190" x2="300" y2="70" stroke="currentColor" stroke-dasharray="4 4" stroke-opacity=".6"/>
            <line x1="40" y1="190" x2="110" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr)"/>
            <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
            <text x="118" y="122" font-size="14" fill="currentColor" font-style="italic">v₀</text>
            <text x="74" y="182" font-size="14" fill="currentColor" font-style="italic">θ</text>
            <text x="308" y="134" font-size="14" fill="currentColor" font-style="italic">H</text>
            <text x="292" y="210" font-size="14" fill="currentColor" font-style="italic">R</text>
          </svg>
          <figcaption>Fig. 1: The path is a parabola, symmetric about the peak when launch and landing heights match.</figcaption>
        </figure>

        <h2>Worked example</h2>
        <p>A ball is kicked at 20 m/s, 30° above level ground. Find the time of flight, maximum height and range.</p>
        <div class="eq">vₓ = 20 cos 30° = 17.3 m/s
vᵧ = 20 sin 30° = 10.0 m/s

T = 2(10.0) / 9.8          = 2.04 s
H = (10.0)² / (2 · 9.8)    = 5.10 m
R = 17.3 · 2.04            = 35.3 m</div>
        <p>Check: R = v₀² sin 2θ / g = 400 · sin 60° / 9.8 = 35.3 m. ✓</p>

        <h2>Practice</h2>
        <ol>
          <li>A stone is thrown horizontally at 12 m/s from a 20 m cliff. How long until it lands, and how far from the base?</li>
          <li>Which launch angle sends a projectile highest for a given speed? Which sends it farthest?</li>
          <li>A football leaves the ground at 25 m/s and lands 60 m away. Find the two possible launch angles.</li>
        </ol>
        <p class="byline" style="margin-top:28px">Answers: (1) 2.02 s, 24.2 m &nbsp;(2) 90°; 45° &nbsp;(3) about 35° and 55°</p>
      </article>`;
  }

  function pageNotFound() {
    return `
      <div class="page"><div class="wrap">
        <p class="eyebrow">Error 404</p>
        <h1 class="page-title">That course isn’t offered this term.</h1>
        <p class="page-lead">It may have been renumbered or withdrawn. Browse the <a href="#/courses">full catalog</a> or return to the <a href="#/">home page</a>.</p>
      </div></div>`;
  }

  /* ---------- Term label ---------- */

  function termName(now = new Date()) {
    const m = now.getMonth();
    const y = now.getFullYear();
    if (m >= 7) return `Fall Term ${y}`;
    if (m <= 4) return `Spring Term ${y}`;
    return `Summer Session ${y}`;
  }
  function termWeek(now = new Date()) {
    const m = now.getMonth();
    const y = now.getFullYear();
    const start = m >= 7 ? new Date(y, 7, 25) : m <= 4 ? new Date(y, 0, 8) : new Date(y, 5, 15);
    const wk = Math.floor((now - start) / (7 * 864e5)) + 1;
    return wk >= 1 && wk <= 18 ? `Week ${wk}` : 'Between terms';
  }

  /* ---------- Router ---------- */

  function parseRoute() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, query] = raw.split('?');
    return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(query || '') };
  }

  let lastPath = null;

  function render() {
    const { parts, params } = parseRoute();
    const [section, arg] = parts;
    let html, title = '', bind = null, nav = section || '';

    switch (section) {
      case undefined: html = pageHome(); break;
      case 'courses': html = pageCatalog(arg && arg.toUpperCase(), params); title = arg ? (DEPTS[arg.toUpperCase()] || {}).name : 'Catalog'; bind = bindCatalog; break;
      case 'course': {
        const c = bySlug.get(arg);
        html = pageCourse(arg); title = c ? `${c.title} (${c.code})` : 'Not found';
        bind = () => bindCourse(arg); nav = 'courses'; break;
      }
      case 'departments': html = pageDepartments(); title = 'Departments'; break;
      case 'schedule': html = pageSchedule(); title = 'My Schedule'; bind = bindSchedule; break;
      case 'preferences': html = pagePreferences(); title = 'Preferences'; bind = bindPreferences; break;
      case 'lesson': html = pageNotes(); break;
      default: html = pageNotFound(); title = 'Not found';
    }

    document.body.classList.toggle('mode-notes', section === 'lesson');
    main.innerHTML = html;
    if (bind) bind();

    if (section === 'lesson') {
      // Notes always read as notes, even with disguise off.
      document.title = prefs.disguise !== 'off' ? (prefs.disguise === 'custom' ? prefs.customTitle || 'Untitled' : DISGUISES[prefs.disguise].title) : 'Projectile Motion – PHY 201 Notes';
      if (prefs.disguise === 'off') $('#favicon').href = DISGUISES.notes.icon;
      else $('#favicon').href = DISGUISES[prefs.disguise].icon;
    } else {
      applyTab(title);
    }

    document.querySelectorAll('[data-nav]').forEach(a => {
      if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (section === 'courses') {
      if (document.activeElement !== searchInput) searchInput.value = params.get('q') || '';
    } else {
      searchInput.value = '';
    }

    const pathKey = parts.join('/');
    if (pathKey !== lastPath) window.scrollTo(0, 0);
    lastPath = pathKey;
  }

  function bindCatalog() {
    const sel = $('#sort');
    if (!sel) return;
    sel.addEventListener('change', () => {
      const { parts, params } = parseRoute();
      sel.value === 'popular' ? params.delete('sort') : params.set('sort', sel.value);
      const qs = params.toString();
      location.hash = '#/' + parts.join('/') + (qs ? '?' + qs : '');
    });
  }

  /* ---------- Global events ---------- */

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    const { parts, params } = parseRoute();
    const onCatalog = parts[0] === 'courses';
    q ? params.set('q', q) : params.delete('q');
    if (!onCatalog) params.delete('sort');
    const base = onCatalog ? '#/' + parts.join('/') : '#/courses';
    const qs = onCatalog ? params.toString() : (q ? 'q=' + encodeURIComponent(q) : '');
    const target = base + (qs ? '?' + qs : '');
    if (onCatalog) { history.replaceState(null, '', target); render(); }
    else location.hash = target;
  });
  $('#search-form').addEventListener('submit', e => {
    e.preventDefault();
    const first = main.querySelector('.grid .card');
    if (first) first.click();
  });

  document.addEventListener('keydown', e => {
    const t = e.target;
    const typing = t.matches('input, textarea, select, [contenteditable]');
    if (e.key === prefs.panicKey && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      panic();
      return;
    }
    if (e.key === '/' && !typing) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === 'Escape' && t === searchInput) {
      searchInput.blur();
    }
  });

  window.addEventListener('hashchange', render);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (prefs.theme === 'system') applyTheme(); });
  }

  /* ---------- Boot ---------- */

  $('#term-name').textContent = termName();
  $('#term-week').textContent = termWeek();
  syncPanicHints();
  applyTheme();
  render();
})();
