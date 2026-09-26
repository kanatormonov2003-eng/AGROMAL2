import { initI18n, language, t } from "./i18n.js";
import { signOut } from "./supabase.js";

export function initCommon() {
  initI18n();
  document.querySelectorAll("[data-logout]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    await signOut();
    window.location.replace("./index.html");
  }));
}

export function setState(element, kind, message) {
  if (!element) return;
  element.className = `notice notice--${kind}`;
  element.textContent = message;
  element.hidden = !message;
}

export function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

export function whatsappUrl(number, message) {
  const normalized = String(number || "").replace(/\D/g, "");
  return /^\d{8,15}$/.test(normalized) ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : "";
}

export function setWhatsappLink(link, number, messages) {
  if (!link) return;
  const message = typeof messages === "function"
    ? messages(language())
    : typeof messages === "string"
      ? messages
      : messages[language()] || messages.ru;
  const url = whatsappUrl(number, message);
  if (url) {
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.removeAttribute("aria-disabled");
  } else {
    link.removeAttribute("href");
    link.removeAttribute("target");
    link.setAttribute("aria-disabled", "true");
    link.title = t("configMissing");
  }
}

export function formatNumber(value) {
  return new Intl.NumberFormat(language() === "ky" ? "ky-KG" : language()).format(Number(value));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat(language() === "ky" ? "ky-KG" : language(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function escapeFilter(value) {
  return encodeURIComponent(String(value).replace(/[(),]/g, ""));
}
