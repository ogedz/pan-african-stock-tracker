// Toast.mjs
// Small, dependency-free toast notifications. Replaces alert()/confirm()
// so confirmations and price-alert triggers don't block the page.

export function showToast(message, type = "info", duration = 4000) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  container.appendChild(toast);

  // Two rAFs so the browser paints the initial (off-screen) state
  // before the "show" class triggers the transition.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => toast.classList.add("show")),
  );

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
