function setNavbarHeightVar() {
  const navbar = document.querySelector(".navbar-main");
  if (!navbar) return;
  document.documentElement.style.setProperty("--navbar-height", `${navbar.offsetHeight}px`);
}

setNavbarHeightVar();
window.addEventListener("resize", setNavbarHeightVar);
document.addEventListener("shown.bs.collapse", setNavbarHeightVar);
document.addEventListener("hidden.bs.collapse", setNavbarHeightVar);
