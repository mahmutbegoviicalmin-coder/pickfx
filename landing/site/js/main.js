document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".navbar");
  const toggle = document.querySelector(".navbar-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  window.addEventListener(
    "scroll",
    () => navbar?.classList.toggle("is-scrolled", window.scrollY > 8),
    { passive: true }
  );

  toggle?.addEventListener("click", () => {
    const open = mobileMenu?.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
  document.querySelector(".hero .reveal")?.classList.add("is-visible");

  document.querySelectorAll(".faq-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const item = trigger.closest(".faq-item");
      const panel = item?.querySelector(".faq-panel");
      const open = !item?.classList.contains("is-open");
      item?.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      trigger.querySelector(".faq-icon").textContent = open ? "−" : "+";
      if (panel) panel.hidden = !open;
    });
  });

  const QUERIES = [
    "Gaussian Blur 30",
    "Scale 120",
    "Opacity 80",
    "Temperature 20",
    "Saturation 40"
  ];

  const SW = "1.5";
  const ICONS = {
    blur:
      '<svg class="icon-svg" viewBox="0 0 16 16" fill="none"><circle cx="7.1" cy="7.1" r="3.05" stroke="currentColor" stroke-width="' +
      SW +
      '" fill="none"/><circle cx="8.35" cy="6.2" r="3.05" stroke="currentColor" stroke-width="' +
      SW +
      '" fill="none"/><path d="M10.55 10.35L13.15 13" stroke="currentColor" stroke-width="' +
      SW +
      '" stroke-linecap="round"/></svg>',
    scale:
      '<svg class="icon-svg" viewBox="0 0 16 16" fill="none"><path d="M3.2 6.35V3.2H6.35M9.65 3.2H12.8V6.35M12.8 9.65V12.8H9.65M6.35 12.8H3.2V9.65" stroke="currentColor" stroke-width="' +
      SW +
      '" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
    opacity:
      '<svg class="icon-svg" viewBox="0 0 16 16" fill="none"><path d="M3.7 5.45h6.4v6.4H3.7Z" stroke="currentColor" stroke-width="' +
      SW +
      '" fill="none"/><path d="M5.85 4.15h6.45v6.45" stroke="currentColor" stroke-width="' +
      SW +
      '" fill="none"/></svg>',
    temperature:
      '<svg class="icon-svg" viewBox="0 0 16 16" fill="none"><path d="M8 2.7c-.72 0-1.3.58-1.3 1.3v5.45a2.35 2.35 0 1 0 2.6 0V4c0-.72-.58-1.3-1.3-1.3Z" stroke="currentColor" stroke-width="' +
      SW +
      '" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 6.35v2.55M10.15 4.35h1.15M10.15 5.7h1.15" stroke="currentColor" stroke-width="' +
      SW +
      '" stroke-linecap="round"/></svg>',
    saturation:
      '<svg class="icon-svg" viewBox="0 0 16 16" fill="none"><path d="M8 2.9c2.15 2.35 3.25 3.85 3.25 5.7A3.25 3.25 0 1 1 4.75 8.6C4.75 6.75 5.85 5.25 8 2.9Z" stroke="currentColor" stroke-width="' +
      SW +
      '" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.85 9.15h2.3" stroke="currentColor" stroke-width="' +
      SW +
      '" stroke-linecap="round"/></svg>',
    check:
      '<svg class="icon-svg" viewBox="0 0 16 16" fill="none"><path class="check-path" d="M3.4 8.2l2.8 2.8 6.4-6.45" stroke="currentColor" stroke-width="' +
      SW +
      '" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
    search:
      '<svg class="icon-svg" viewBox="0 0 16 16" fill="none"><circle cx="6.85" cy="6.85" r="4.15" stroke="currentColor" stroke-width="' +
      SW +
      '" fill="none"/><path d="M10.05 10.05L13.25 13.25" stroke="currentColor" stroke-width="' +
      SW +
      '" stroke-linecap="round"/></svg>',
    ellipsis:
      '<svg class="icon-svg" viewBox="0 0 16 16" fill="none"><circle cx="3.5" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="12.5" cy="8" r="1" fill="currentColor"/></svg>'
  };

  function iconForQuery(query) {
    const q = String(query || "").toLowerCase();
    if (q.includes("blur")) return ICONS.blur;
    if (q.includes("scale")) return ICONS.scale;
    if (q.includes("opacity")) return ICONS.opacity;
    if (q.includes("temperature")) return ICONS.temperature;
    if (q.includes("saturation")) return ICONS.saturation;
    return ICONS.saturation;
  }

  function setTyped(textEl, value, showCaret) {
    if (!textEl) return;
    textEl.textContent = value;
    if (showCaret) {
      const caret = document.createElement("span");
      caret.className = "palette-caret";
      caret.setAttribute("aria-hidden", "true");
      textEl.appendChild(caret);
    }
  }

  function bindPanelDemo(root, options = {}) {
    if (!root) return;
    const queries = options.queries || QUERIES;
    const params = options.paramsRoot
      ? Array.from(options.paramsRoot.querySelectorAll("[data-showcase-param]"))
      : [];
    let queryIndex = 0;
    let cancelled = false;
    const textEl = root.querySelector("[data-typed]");
    const resultEl = root.querySelector("[data-result]");
    const resultNameEl = root.querySelector("[data-result-name]");
    const resultSubEl = root.querySelector("[data-result-sub]");
    const actionEl = root.querySelector("[data-action]");
    const iconEl = root.querySelector("[data-icon]");
    const countEl = root.querySelector("[data-count]");
    const mutedRows = Array.from(root.querySelectorAll("[data-muted]"));
    const menuEl = root.querySelector(".panel-demo-menu");
    const searchIconEl = root.querySelector(".panel-demo-search-icon");

    if (menuEl && !menuEl.querySelector("svg")) menuEl.innerHTML = ICONS.ellipsis;
    if (searchIconEl) searchIconEl.innerHTML = ICONS.search;

    function setActiveParam(index) {
      params.forEach((el, i) => el.classList.toggle("is-active", i === index));
    }

    function setMuted(activeQuery) {
      const others = queries.filter((q) => q !== activeQuery);
      mutedRows.forEach((row, i) => {
        const name = others[i];
        const nameEl = row.querySelector("[data-muted-name]");
        const iconWrap = row.querySelector("[data-muted-icon]");
        if (!name) {
          row.hidden = true;
          return;
        }
        row.hidden = false;
        if (nameEl) nameEl.textContent = name;
        if (iconWrap) iconWrap.innerHTML = iconForQuery(name);
      });
    }

    function showMatch(query) {
      resultEl?.removeAttribute("hidden");
      resultEl?.classList.add("is-selected");
      resultEl?.classList.remove("is-success");
      if (resultNameEl) resultNameEl.textContent = query;
      if (resultSubEl) {
        resultSubEl.textContent = "";
        resultSubEl.hidden = true;
      }
      if (iconEl) iconEl.innerHTML = iconForQuery(query);
      if (actionEl) {
        actionEl.hidden = false;
        actionEl.innerHTML = 'Apply <span class="keycap">↵</span>';
      }
      mutedRows.forEach((row) => {
        row.hidden = row.hidden;
      });
      setMuted(query);
      if (countEl) countEl.textContent = "1 effect";
    }

    function showSuccess(query) {
      resultEl?.removeAttribute("hidden");
      resultEl?.classList.remove("is-selected");
      resultEl?.classList.add("is-success");
      if (resultNameEl) resultNameEl.textContent = query;
      if (resultSubEl) {
        resultSubEl.textContent = "Applied successfully";
        resultSubEl.removeAttribute("hidden");
      }
      if (iconEl) iconEl.innerHTML = ICONS.check;
      if (actionEl) {
        actionEl.innerHTML = "";
        actionEl.setAttribute("hidden", "");
      }
      mutedRows.forEach((row) => row.setAttribute("hidden", ""));
      if (countEl) countEl.textContent = "1 effect";
    }

    function resetResult() {
      resultEl?.classList.remove("is-selected", "is-success");
      resultEl?.setAttribute("hidden", "");
      if (resultSubEl) {
        resultSubEl.textContent = "";
        resultSubEl.setAttribute("hidden", "");
      }
      if (actionEl) {
        actionEl.textContent = "";
        actionEl.setAttribute("hidden", "");
      }
      if (iconEl) iconEl.innerHTML = "";
      mutedRows.forEach((row) => row.setAttribute("hidden", ""));
      if (countEl) countEl.textContent = "0 effects";
    }

    function runCycle() {
      if (cancelled) return;
      const index = queryIndex % queries.length;
      const query = queries[index];
      setActiveParam(index);
      resetResult();
      setTyped(textEl, "", true);

      let i = 0;
      const typeTimer = setInterval(() => {
        if (cancelled) {
          clearInterval(typeTimer);
          return;
        }
        i += 1;
        setTyped(textEl, query.slice(0, i), true);
        if (i >= 1) showMatch(query);
        if (i >= query.length) {
          clearInterval(typeTimer);
          setTyped(textEl, query, false);
          setTimeout(() => {
            if (cancelled) return;
            showSuccess(query);
          }, 700);
          setTimeout(() => {
            if (cancelled) return;
            resetResult();
            let j = query.length;
            setTyped(textEl, query, true);
            const eraseTimer = setInterval(() => {
              if (cancelled) {
                clearInterval(eraseTimer);
                return;
              }
              j -= 1;
              setTyped(textEl, query.slice(0, Math.max(0, j)), true);
              if (j <= 0) {
                clearInterval(eraseTimer);
                queryIndex += 1;
                setTimeout(runCycle, 320);
              }
            }, 28);
          }, 2400);
        }
      }, 55);
    }

    runCycle();
  }

  bindPanelDemo(document.getElementById("hero-palette"));
  bindPanelDemo(document.getElementById("showcase-panel"), {
    paramsRoot: document.querySelector("[data-showcase-params]")
  });

  // Static panels (compare / snapshots): inject real plugin icons
  document.querySelectorAll(".panel-demo").forEach((panel) => {
    const menuEl = panel.querySelector(".panel-demo-menu");
    const searchIconEl = panel.querySelector(".panel-demo-search-icon");
    if (menuEl && !menuEl.querySelector("svg")) menuEl.innerHTML = ICONS.ellipsis;
    if (searchIconEl && !searchIconEl.querySelector("svg")) searchIconEl.innerHTML = ICONS.search;
    panel.querySelectorAll("[data-static-icon]").forEach((el) => {
      const key = el.getAttribute("data-static-icon");
      if (ICONS[key]) el.innerHTML = ICONS[key];
    });
  });
});
