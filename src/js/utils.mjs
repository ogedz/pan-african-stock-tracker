// Utils.mjs
// Shared formatting, DOM, and page-bootstrap helpers.

import {
  getPreferredCurrency,
  setPreferredCurrency,
  listSupportedCurrencies,
} from "./Currency.mjs";

export function getParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

export function formatNumber(value, decimals = 2) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function renderWithTemplate(template, parentElement) {
  parentElement.innerHTML = template;
}

export async function loadTemplate(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load template: ${res.status}`);
  }
  return res.text();
}

export async function loadHeaderFooter() {
  const headerEl = qs("#main-header");
  const footerEl = qs("#main-footer");
  if (headerEl) {
    renderWithTemplate(await loadTemplate("/partials/header.html"), headerEl);
    initThemeToggle();
    initCurrencySelector();
    initSidebarNav();
    setActiveNav();
  }
  if (footerEl) {
    renderWithTemplate(await loadTemplate("/partials/footer.html"), footerEl);
  }

  // Runs once per page load, on every page (since every page has a
  // header). Dynamically imported so Alerts.mjs — and the StockData.mjs
  // fetch/cache logic it pulls in — loads in its own chunk after the
  // header/footer paint, instead of blocking first render.
  const { checkAndNotify } = await import("./Alerts.mjs");
  checkAndNotify();
}

function initThemeToggle() {
  const stored = localStorage.getItem("pat-theme") || "light";
  document.documentElement.setAttribute("data-theme", stored);

  const toggleBtn = qs("#themeToggle");
  if (!toggleBtn) return;

  toggleBtn.textContent = stored === "dark" ? "☀️" : "🌙";
  toggleBtn.setAttribute(
    "aria-label",
    stored === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );
  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pat-theme", next);
    toggleBtn.textContent = next === "dark" ? "☀️" : "🌙";
    toggleBtn.setAttribute(
      "aria-label",
      next === "dark" ? "Switch to light mode" : "Switch to dark mode",
    );
  });
}

function initSidebarNav() {
  const toggle = qs("#navToggle");
  const sidebar = qs("#sidebar");
  const overlay = qs("#sidebarOverlay");
  if (!toggle || !sidebar) return;

  function openNav() {
    sidebar.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation");
    if (overlay) {
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("is-visible"));
    }
    document.body.classList.add("nav-open");
  }

  function closeNav() {
    sidebar.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    if (overlay) {
      overlay.classList.remove("is-visible");
      setTimeout(() => {
        overlay.hidden = true;
      }, 200);
    }
    document.body.classList.remove("nav-open");
  }

  toggle.addEventListener("click", () => {
    if (sidebar.classList.contains("is-open")) closeNav();
    else openNav();
  });

  if (overlay) {
    overlay.addEventListener("click", closeNav);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("is-open")) closeNav();
  });

  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) closeNav();
    });
  });
}

function setActiveNav() {
  const path = window.location.pathname;
  const links = qsa(".sidebar-nav a");
  links.forEach((a) => {
    a.removeAttribute("aria-current");
    a.classList.remove("is-active");
  });

  let match = null;
  if (path.includes("/portfolio")) match = "portfolio";
  else if (path.includes("/watchlist")) match = "watchlist";
  else if (path.includes("/alerts")) match = "alerts";
  else if (path.includes("/settings")) match = "settings";
  else if (path.includes("/stock")) match = null;
  else match = "home";

  if (match) {
    const active = qs(`.sidebar-nav a[data-nav="${match}"]`);
    if (active) {
      active.setAttribute("aria-current", "page");
      active.classList.add("is-active");
    }
  }

  const titleEl = qs("#topbarTitle");
  if (titleEl) {
    const titles = {
      home: "Pan-African Stock Tracker",
      portfolio: "My Portfolio",
      watchlist: "My Watchlist",
      alerts: "Price Alerts",
      settings: "Settings",
    };
    titleEl.textContent = titles[match] || "Pan-African Stock Tracker";
  }
}

// Populates the currency selector in the header and wires it to
// Currency.mjs's stored preference. Dispatches a "currencychange" event
// on window so each page's own script can re-render prices without
// utils.mjs needing to know what any given page looks like.
function initCurrencySelector() {
  const select = qs("#currencySelector");
  if (!select) return;

  select.innerHTML = listSupportedCurrencies()
    .map((code) => `<option value="${code}">${code}</option>`)
    .join("");
  select.value = getPreferredCurrency();

  select.addEventListener("change", () => {
    setPreferredCurrency(select.value);
    window.dispatchEvent(
      new CustomEvent("currencychange", { detail: select.value }),
    );
  });
}

export function renderListWithTemplate(
  templateFn,
  parentElement,
  list,
  position = "afterbegin",
  clear = false,
) {
  if (clear) {
    parentElement.innerHTML = "";
  }
  const htmlStrings = list.map(templateFn);
  parentElement.insertAdjacentHTML(position, htmlStrings.join(""));
}

// --- Number animation ---------------------------------------------------
// Counts a number up from 0 to its target value. Elements opt in by
// carrying data-animate="<value>" (and optionally data-decimals and
// data-prefix); call animateAllIn(container) after inserting HTML that
// contains them. Respects prefers-reduced-motion by jumping straight
// to the final value instead of animating.

const REDUCE_MOTION = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

export function animateNumber(
  el,
  endValue,
  { decimals = 2, duration = 700, prefix = "" } = {},
) {
  if (REDUCE_MOTION || !Number.isFinite(endValue)) {
    el.textContent = `${prefix}${formatNumber(endValue, decimals)}`;
    return;
  }

  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = endValue * eased;
    el.textContent = `${prefix}${formatNumber(current, decimals)}`;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

export function animateAllIn(container) {
  qsa("[data-animate]", container).forEach((el) => {
    const endValue = parseFloat(el.dataset.animate);
    const decimals = parseInt(el.dataset.decimals || "2", 10);
    const prefix = el.dataset.prefix || "";
    animateNumber(el, endValue, { decimals, prefix });
  });
}
