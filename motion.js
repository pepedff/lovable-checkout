/* ==================================================================
   LOVABLEUNLIMITED — MOTION LAYER
   Scroll suavizado (inércia), revelação ao rolar, barra de progresso,
   brilho que segue o cursor nos cards, scrollspy dos termos e
   contagem animada das métricas do admin.
   Não altera IDs nem a lógica de app.js / admin.js.
   Respeita "reduzir movimento" do sistema e não interfere em toque.
   ================================================================== */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ------------------------------------------------------------
     1) SCROLL SUAVE COM INÉRCIA (roda do mouse / trackpad)
     Funciona na janela e em caixas roláveis (ex.: termos).
     ------------------------------------------------------------ */
  const LERP = 0.11;
  const states = new Map(); // container -> {target, current, raf}

  const isWin = (c) => c === window;
  const getTop = (c) => (isWin(c) ? window.scrollY : c.scrollTop);
  const getMax = (c) =>
    isWin(c) ? root.scrollHeight - window.innerHeight : c.scrollHeight - c.clientHeight;
  const setTop = (c, y) => (isWin(c) ? window.scrollTo(0, y) : (c.scrollTop = y));

  function state(c) {
    let s = states.get(c);
    if (!s) {
      s = { target: getTop(c), current: getTop(c), raf: 0 };
      states.set(c, s);
    }
    return s;
  }

  function tick(c) {
    const s = state(c);
    s.current += (s.target - s.current) * LERP;
    if (Math.abs(s.target - s.current) < 0.5) s.current = s.target;
    setTop(c, s.current);
    s.raf = s.current === s.target ? 0 : requestAnimationFrame(() => tick(c));
  }

  function animateTo(c, y) {
    const s = state(c);
    if (!s.raf) s.current = getTop(c);
    s.target = clamp(y, 0, getMax(c));
    if (reduce) { setTop(c, s.target); s.current = s.target; return; }
    if (!s.raf) s.raf = requestAnimationFrame(() => tick(c));
  }

  // Encontra o container rolável que deve receber a roda
  function scrollableFor(el, dy) {
    while (el && el !== document.body && el !== root) {
      if (el.nodeType === 1) {
        const st = getComputedStyle(el);
        if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1) {
          const s = states.get(el);
          const top = s && s.raf ? s.target : el.scrollTop;
          const max = el.scrollHeight - el.clientHeight;
          if ((dy > 0 && top < max - 1) || (dy < 0 && top > 1)) return el;
        }
        // <dialog> aberto e selects nativos: deixa o navegador cuidar
        if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return null;
      }
      el = el.parentNode;
    }
    return window;
  }

  if (!reduce) {
    window.addEventListener('wheel', (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) return; // horizontal = nativo
      const dialogOpen = document.querySelector('dialog[open]');
      if (dialogOpen && !dialogOpen.contains(e.target)) return;
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      const c = scrollableFor(e.target, dy);
      if (!c) return;
      e.preventDefault();
      const s = state(c);
      if (!s.raf) s.target = getTop(c);
      animateTo(c, s.target + dy);
    }, { passive: false });

    // Rolagem programática, teclado, barra de rolagem: sincroniza o alvo
    window.addEventListener('scroll', () => {
      const s = states.get(window);
      if (s && !s.raf) { s.target = s.current = window.scrollY; }
    }, { passive: true });
    ['keydown', 'pointerdown', 'touchstart'].forEach((ev) =>
      window.addEventListener(ev, () => {
        states.forEach((s, c) => { if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; } s.target = s.current = getTop(c); });
      }, { passive: true })
    );
  }

  /* ------------------------------------------------------------
     2) BARRA DE PROGRESSO DE ROLAGEM (topo)
     ------------------------------------------------------------ */
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  let barRaf = 0;
  function updateBar() {
    barRaf = 0;
    const max = root.scrollHeight - window.innerHeight;
    const p = max > 8 ? window.scrollY / max : 0;
    bar.style.transform = `scaleX(${clamp(p, 0, 1)})`;
    bar.classList.toggle('is-visible', max > 8 && window.scrollY > 4);
    root.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  const queueBar = () => { if (!barRaf) barRaf = requestAnimationFrame(updateBar); };
  window.addEventListener('scroll', queueBar, { passive: true });
  window.addEventListener('resize', queueBar);
  new ResizeObserver(queueBar).observe(document.body);

  /* ------------------------------------------------------------
     3) REVELAÇÃO AO ROLAR (fade + subida, com escalonamento)
     ------------------------------------------------------------ */
  const REVEAL = [
    '.terms-top-inner', '.terms-sidebar .sidebar-nav', '.terms-scroll-box', '.section-heading',
    '.step-card', '.accept-card', '.checkout-header', '.co-left', '.co-right .summary-card',
    '.plan-hero-card', '.plan-tier-card', '.pix-section', '.result-card', '.status-card',
    '.delivery-card',
    '.page-heading', '.stat-card', '.chart-card', '.insight-row article', '.table-section',
    '.settings-card', '.coupon-card', '.ticket-card', '.plan-banner', '.delivery-card-item',
    '.data-toolbar', '.extension-summary', '.login-card', '.login-story h2', '.login-story > p'
  ].join(',');

  const io = reduce ? null : new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      io.unobserve(el);
      el.classList.add('rv-in');
      const done = () => { el.classList.remove('rv', 'rv-in'); el.style.removeProperty('--rv-delay'); };
      el.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 1600);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

  function armReveal(scope) {
    if (reduce) return;
    const groups = new Map();
    scope.querySelectorAll(REVEAL).forEach((el) => {
      if (el.dataset.rvDone) return;
      el.dataset.rvDone = '1';
      const parent = el.parentElement;
      const i = groups.get(parent) || 0;
      groups.set(parent, i + 1);
      el.style.setProperty('--rv-delay', `${Math.min(i, 6) * 70}ms`);
      el.classList.add('rv');
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------
     4) BRILHO QUE SEGUE O CURSOR NOS CARDS (spotlight)
     ------------------------------------------------------------ */
  const SPOT = [
    '.step-card', '.accept-card', '.co-left', '.summary-card', '.plan-tier-card', '.plan-hero-card',
    '.result-card', '.status-card', '.delivery-card',
    '.stat-card', '.chart-card', '.table-section', '.settings-card', '.coupon-card', '.ticket-card',
    '.delivery-card-item', '.sidebar-help'
  ].join(',');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function armSpot(scope) {
    if (!finePointer) return;
    scope.querySelectorAll(SPOT).forEach((el) => {
      if (el.dataset.spot) return;
      el.dataset.spot = '1';
      const cs = getComputedStyle(el);
      if (getComputedStyle(el, '::after').content !== 'none') return; // já usa ::after
      el.classList.add('spot');
      if (cs.position === 'static') el.classList.add('spot-rel');
    });
  }
  if (finePointer) {
    let last = null;
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.spot');
      if (last && last !== el) last.classList.remove('spot-on');
      last = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
      el.classList.add('spot-on');
    }, { passive: true });
    document.addEventListener('pointerleave', () => last && last.classList.remove('spot-on'));
  }

  /* ------------------------------------------------------------
     5) TERMOS: links da lateral rolam a caixa suavemente + scrollspy
     ------------------------------------------------------------ */
  const box = document.querySelector('.terms-scroll-box');
  if (box) {
    const links = [...document.querySelectorAll('.sb-link[data-section]')];
    const sections = [...box.querySelectorAll('.t-section')];

    links.forEach((a) => a.addEventListener('click', (e) => {
      const sec = document.getElementById(a.dataset.section);
      if (!sec || !box.contains(sec)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const bRect = box.getBoundingClientRect();
      if (bRect.top < 0 || bRect.top > window.innerHeight * 0.4) {
        animateTo(window, window.scrollY + bRect.top - 24);
      }
      const y = sec.getBoundingClientRect().top - bRect.top + box.scrollTop - 24;
      animateTo(box, y);
      links.forEach((l) => l.classList.toggle('active', l === a));
      history.replaceState(null, '', '#' + a.dataset.section);
    }, true));

    let spyRaf = 0;
    const spy = () => {
      spyRaf = 0;
      if (!box.offsetParent) return; // tela dos termos ainda escondida
      const top = box.getBoundingClientRect().top + 60;
      let cur = sections[0];
      sections.forEach((s) => { if (s.getBoundingClientRect().top <= top) cur = s; });
      links.forEach((l) => l.classList.toggle('active', cur && l.dataset.section === cur.id));
      box.classList.toggle('is-end', box.scrollTop >= box.scrollHeight - box.clientHeight - 4);
      box.style.setProperty('--read', (box.scrollTop / Math.max(1, box.scrollHeight - box.clientHeight)).toFixed(3));
    };
    const queueSpy = () => { if (!spyRaf) spyRaf = requestAnimationFrame(spy); };
    box.addEventListener('scroll', queueSpy, { passive: true });
    // roda depois do scrollspy antigo (app.js) para prevalecer
    window.addEventListener('scroll', queueSpy, { passive: true });
    const termsView = document.getElementById('viewTerms');
    if (termsView) new MutationObserver(queueSpy).observe(termsView, { attributes: true, attributeFilter: ['style', 'class'] });
    window.addEventListener('load', queueSpy);
    spy();
  }

  /* ------------------------------------------------------------
     6) ADMIN: contagem animada nas métricas
     ------------------------------------------------------------ */
  function countUp(scope) {
    if (reduce) return;
    scope.querySelectorAll('.stat-card strong').forEach((el) => {
      if (el.dataset.counting) return;
      const txt = el.textContent.trim();
      if (el.dataset.counted === txt) return;
      const m = txt.match(/^(R\$\s?)?([\d.]+(?:,\d+)?)$/);
      if (!m) return;
      const money = !!m[1];
      const target = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
      if (!isFinite(target) || target === 0) return;
      el.dataset.counted = txt;
      el.dataset.counting = '1';
      const fmt = money
        ? (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : (v) => Math.round(v).toLocaleString('pt-BR');
      const t0 = performance.now(), dur = 900;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(target * e);
        if (k < 1) requestAnimationFrame(step); else { el.textContent = txt; delete el.dataset.counting; }
      };
      requestAnimationFrame(step);
    });
  }


  /* ------------------------------------------------------------
     7) FEEDBACK DENTRO DO BOTÃO (substitui notificações de sucesso)
     O conteúdo sai, um painel com ✓ desenhado entra, e depois tudo volta.
     Uso: LUButton.success(botao, 'Copiado')
     ------------------------------------------------------------ */
  const CHECK_SVG = '<svg class="btn-fx-check" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const live = document.createElement('div');
  live.className = 'sr-only'; live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);

  function shortLabel(msg) {
    const m = String(msg || '').toLowerCase();
    if (/chave|licen/.test(m) && /gerad|criad/.test(m)) return 'Chave gerada';
    if (/copi/.test(m)) return 'Copiado';
    if (/salv|atualiz|publica/.test(m)) return 'Salvo';
    if (/aprov|confirm/.test(m)) return 'Confirmado';
    if (/entreg/.test(m)) return 'Entregue';
    if (/envi/.test(m)) return 'Enviado';
    if (/cria|gerad/.test(m)) return 'Criado';
    if (/exclu|remov|apag/.test(m)) return 'Removido';
    if (/rejeit|recus/.test(m)) return 'Rejeitado';
    return 'Pronto';
  }

  const LUButton = {
    _last: null, _lastText: '', _lastId: '', _lastAt: 0,
    success(btn, label = 'Pronto', hold = 1500) {
      if (!btn || !(btn instanceof HTMLElement)) return false;
      let fx = btn.querySelector(':scope > .btn-fx');
      if (!fx) {
        fx = document.createElement('span');
        fx.className = 'btn-fx';
        fx.setAttribute('aria-hidden', 'true');
        btn.appendChild(fx);
      }
      fx.innerHTML = CHECK_SVG + '<span class="btn-fx-text"></span>';
      fx.querySelector('.btn-fx-text').textContent = label;
      // Botão estreito: mostra só o ✓ (sem texto cortado)
      fx.classList.remove('fx-compact');
      const txt = fx.querySelector('.btn-fx-text');
      const need = 18 + 8 + txt.scrollWidth + 20;
      if (need > btn.clientWidth) fx.classList.add('fx-compact');
      btn._fx = fx;
      // Se o código trocar o texto do botão durante a animação, o painel ✓ é mantido
      if (!btn._fxObs) {
        btn._fxObs = new MutationObserver(() => {
          const active = btn.classList.contains('is-success') || btn.classList.contains('is-leaving');
          if (active && btn._fx && !btn._fx.isConnected) btn.appendChild(btn._fx);
        });
        btn._fxObs.observe(btn, { childList: true });
      }
      clearTimeout(btn._fxT1); clearTimeout(btn._fxT2);
      btn.classList.add('fx-host');
      if (getComputedStyle(btn).position === 'static') btn.classList.add('fx-rel');
      btn.classList.remove('is-success', 'is-leaving');
      void btn.offsetWidth; // reinicia a animação
      btn.classList.add('is-success');
      live.textContent = label;
      btn._fxT1 = setTimeout(() => {
        btn.classList.remove('is-success');
        btn.classList.add('is-leaving');
        btn._fxT2 = setTimeout(() => btn.classList.remove('is-leaving'), 520);
      }, reduce ? 900 : hold);
      return true;
    },
    // Usado pelo admin: se a mensagem veio de um clique recente, mostra no botão
    fromToast(message) {
      if (Date.now() - this._lastAt > 6000 || !this._last) return false;
      let btn = this._last;
      if (!document.contains(btn) || !btn.offsetParent) {
        btn = (this._lastId && document.getElementById(this._lastId)) ||
          [...document.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim() === this._lastText) || null;
      }
      if (!btn || !btn.offsetParent || btn.closest('dialog:not([open])')) return false;
      live.textContent = message;
      return this.success(btn, shortLabel(message));
    }
  };
  window.LUButton = LUButton;
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button, .btn-primary, .btn-outline');
    if (!b || b.matches('.menu-item, .dialog-close, .icon-button, .admin-avatar, .filter-tab, .settings-nav button, [data-route]')) return;
    LUButton._last = b; LUButton._lastAt = Date.now();
    LUButton._lastId = b.id || ''; LUButton._lastText = b.textContent.trim();
  }, true);

  /* ------------------------------------------------------------
     8) DIALOG: abrir e fechar com animação (sem mudar a lógica)
     ------------------------------------------------------------ */
  function smoothDialog(d) {
    if (d._smooth || reduce) return;
    d._smooth = true;
    const origClose = d.close.bind(d);
    const origShow = d.showModal.bind(d);
    d.close = function (v) {
      if (!d.open || d._closing) return;
      d._closing = true;
      d.classList.add('is-closing');
      d._closeT = setTimeout(() => {
        d._closing = false;
        d.classList.remove('is-closing');
        origClose(v);
      }, 220);
    };
    d.showModal = function () {
      if (d._closing) { // reabriu antes de terminar de fechar
        clearTimeout(d._closeT);
        d._closing = false;
        d.classList.remove('is-closing');
        d.style.animation = 'none'; void d.offsetWidth; d.style.animation = '';
        return;
      }
      origShow();
    };
    d.addEventListener('cancel', (e) => { e.preventDefault(); d.close(); });
  }
  document.querySelectorAll('dialog').forEach(smoothDialog);

  /* ------------------------------------------------------------
     9) ADMIN: indicador deslizante no menu + troca suave de página
     ------------------------------------------------------------ */
  function slidingIndicator(navEl, activeSel, extraTargets = []) {
    navEl.classList.add('has-indicator');
    const ind = document.createElement('span');
    ind.className = 'nav-indicator';
    ind.setAttribute('aria-hidden', 'true');
    let placed = false;
    const place = () => {
      if (!ind.isConnected) navEl.prepend(ind);
      const a = navEl.querySelector(activeSel);
      if (!a || !a.offsetParent) { ind.style.opacity = '0'; return; }
      if (!placed) ind.style.transition = 'none';
      ind.style.opacity = '1';
      ind.style.width = `${a.offsetWidth}px`;
      ind.style.height = `${a.offsetHeight}px`;
      ind.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
      if (!placed) { void ind.offsetWidth; ind.style.transition = ''; placed = true; }
    };
    navEl.prepend(ind);
    new MutationObserver(place).observe(navEl, { attributes: true, subtree: true, attributeFilter: ['class'] });
    new ResizeObserver(place).observe(navEl);
    window.addEventListener('resize', place);
    extraTargets.forEach((el) => el && new MutationObserver(() => requestAnimationFrame(place))
      .observe(el, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] }));
    place();
    return place;
  }

  // Menu lateral dos termos (página pública)
  const termsNav = document.getElementById('sidebarNav');
  if (termsNav) slidingIndicator(termsNav, '.sb-link.active', [document.getElementById('viewTerms')]);

  const nav = document.getElementById('adminNav');
  if (nav) {
    slidingIndicator(nav, '.menu-item.active', [document.getElementById('adminPanel')]);

    // Título da página troca com fade
    const title = document.getElementById('adminPageTitle');
    if (title) new MutationObserver(() => {
      title.classList.remove('title-swap'); void title.offsetWidth; title.classList.add('title-swap');
    }).observe(title, { childList: true, characterData: true, subtree: true });
  }

  /* ------------------------------------------------------------
     INICIALIZAÇÃO + conteúdo renderizado depois (admin, trocas de tela)
     ------------------------------------------------------------ */
  function arm(scope) { armReveal(scope); armSpot(scope); countUp(scope); }
  root.classList.add('motion-ready');
  arm(document);
  queueBar();

  let moRaf = 0;
  new MutationObserver(() => {
    if (moRaf) return;
    moRaf = requestAnimationFrame(() => { moRaf = 0; arm(document); queueBar(); });
  }).observe(document.body, { childList: true, subtree: true });
})();
