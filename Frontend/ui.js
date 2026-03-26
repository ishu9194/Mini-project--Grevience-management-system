const SIDEBAR_COLLAPSE_KEY = "gh.sidebarCollapsed";

function ensureSidebarBackdrop() {
  let backdrop = document.querySelector(".sidebar-backdrop");
  if (backdrop) return backdrop;

  backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  document.body.appendChild(backdrop);
  return backdrop;
}

export function initSidebar({
  sidebarId = "sidebar",
  toggleId = "sidebarToggle",
  desktopBreakpointPx = 992,
} = {}) {
  const sidebar = document.getElementById(sidebarId);
  const toggle = document.getElementById(toggleId);
  if (!sidebar || !toggle) {
    return {
      open: () => {},
      close: () => {},
      toggle: () => {},
      isMobile: () => window.innerWidth < desktopBreakpointPx,
    };
  }

  const backdrop = ensureSidebarBackdrop();

  const isMobile = () => window.innerWidth < desktopBreakpointPx;

  const setMobileOpen = (open) => {
    sidebar.classList.toggle("is-open", open);
    document.body.classList.toggle("sidebar-open", open);
    backdrop.classList.toggle("is-visible", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  const setDesktopCollapsed = (collapsed) => {
    document.body.classList.toggle("layout--sidebar-collapsed", collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "1" : "0");
    toggle.setAttribute("aria-expanded", String(!collapsed));
  };

  const close = () => {
    if (isMobile()) setMobileOpen(false);
  };

  const open = () => {
    if (isMobile()) setMobileOpen(true);
  };

  const toggleSidebar = () => {
    if (isMobile()) {
      setMobileOpen(!sidebar.classList.contains("is-open"));
      return;
    }
    setDesktopCollapsed(!document.body.classList.contains("layout--sidebar-collapsed"));
  };

  // Initial state
  const savedCollapse = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
  if (isMobile()) {
    setMobileOpen(false);
  } else {
    setDesktopCollapsed(savedCollapse);
  }

  toggle.addEventListener("click", toggleSidebar);
  backdrop.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  window.addEventListener("resize", () => {
    if (isMobile()) {
      document.body.classList.remove("layout--sidebar-collapsed");
      close();
    } else {
      setMobileOpen(false);
      setDesktopCollapsed(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1");
    }
  });

  return { open, close, toggle: toggleSidebar, isMobile };
}
