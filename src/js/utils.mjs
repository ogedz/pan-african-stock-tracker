// src/js/utils.mjs

/**
 * Load an HTML partial from a path
 */
export async function loadTemplate(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`Failed to load template: ${res.status}`);
    }
    return await res.text();
  } catch (error) {
    console.error("Error loading template:", error);
    return "";
  }
}

/**
 * Render a template into a parent element
 */
export function renderWithTemplate(template, parentElement) {
  if (!parentElement) return;
  parentElement.innerHTML = template;
}

/**
 * Load header and footer partials
 */
export async function loadHeaderFooter() {
  try {
    // Load header
    const headerTemplate = await loadTemplate("/partials/header.html");
    const headerElement = document.querySelector("#main-header");
    if (headerElement) {
      renderWithTemplate(headerTemplate, headerElement);
    }

    // Load footer
    const footerTemplate = await loadTemplate("/partials/footer.html");
    const footerElement = document.querySelector("#main-footer");
    if (footerElement) {
      renderWithTemplate(footerTemplate, footerElement);
    }
  } catch (error) {
    console.error("Error loading header/footer:", error);
  }
}