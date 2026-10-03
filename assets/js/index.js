import { initCommon, setState } from "./common.js?v=20261003c";
import { requireAccess } from "./auth.js?v=20261003c";
import { signIn, signOut } from "./supabase.js?v=20261003c";
import { t } from "./i18n.js?v=20261003c";

initCommon();

const form = document.querySelector("#login-form");
const identifier = document.querySelector("#identifier");
const password = document.querySelector("#password");
const submit = document.querySelector("#login-button");
const message = document.querySelector("#login-message");
const consent = document.querySelector("#privacy-consent");

const HOMEPAGE_WHATSAPP_URL = "https://wa.me/996501095950";

function ensureHomepageWhatsappLinks() {
  document
    .querySelectorAll(
      ".hero-access-card--buyer, .hero-access-card--farm, .hero-help__content a"
    )
    .forEach((link) => {
      link.href = HOMEPAGE_WHATSAPP_URL;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
}

ensureHomepageWhatsappLinks();

document.addEventListener(
  "agromal:language",
  () => {
    // DEMO-лоты на главной странице являются
    // статическим контентом index.html.
    // Здесь намеренно ничего не загружаем из Supabase.
  }
);


/* =========================================================
   AUTH MESSAGE
   ========================================================= */

const authReason =
  new URLSearchParams(location.search).get("auth");

if (authReason) {
  const reasonKeys = {
    blocked: "blocked",
    expired: "expired",
    forbidden: "forbidden",
    configuration: "configMissing"
  };

  setState(
    message,
    "error",
    t(reasonKeys[authReason] || "expired")
  );
}


/* =========================================================
   PASSWORD VISIBILITY TOGGLE
   ========================================================= */

const eye = document.querySelector("#toggle-password");
const eyeIconShow = eye && eye.querySelector("svg");

if (eye) {
  eye.addEventListener(
    "click",
    () => {
      const shown = password.type === "text";
      password.type = shown ? "password" : "text";
      eye.setAttribute("aria-pressed", String(!shown));
      eye.setAttribute(
        "aria-label",
        shown ? t("showPassword") : t("hidePassword")
      );

      if (eyeIconShow) {
        eyeIconShow.innerHTML = shown
          ? '<path d="M2.6 12S6.1 6.6 12 6.6 21.4 12 21.4 12 17.9 17.4 12 17.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.6"/>'
          : '<path d="M3 3l18 18"/><path d="M10.6 5.9a9.6 9.6 0 0 1 1.4-.3"/><path d="M6.2 7.8C4 9.1 2.6 12 2.6 12s3.5 5.4 9.4 5.4c1.5 0 2.8-.3 4-.9"/><path d="M9.9 9.9a2.6 2.6 0 0 0 3.6 3.6"/>';
      }
    }
  );
}


/* =========================================================
   IDENTIFIER
   ========================================================= */

identifier.addEventListener(
  "input",
  () => {
    identifier.value = identifier.value
      .replace(/\D/g, "")
      .slice(0, 14);
  }
);


/* =========================================================
   PRIVACY CONSENT
   ========================================================= */

if (consent) {
  consent.addEventListener(
    "change",
    () => {
      if (consent.checked) {
        const wrapper = consent.closest(".privacy-check");
        if (wrapper) wrapper.classList.remove("privacy-check--invalid");
      }
    }
  );
}

/* =========================================================
   LOGIN
   ========================================================= */

form.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    setState(
      message,
      "error",
      ""
    );

    const inn =
      identifier.value.trim();

    if (!/^\d{8,14}$/.test(inn)) {
      return setState(
        message,
        "error",
        t("invalidInn")
      );
    }

    if (password.value.length < 8) {
      return setState(
        message,
        "error",
        t("passwordShort")
      );
    }

    if (consent && !consent.checked) {
      const wrapper = consent.closest(".privacy-check");
      if (wrapper) {
        wrapper.classList.remove("privacy-check--invalid");
        void wrapper.offsetWidth;
        wrapper.classList.add("privacy-check--invalid");
      }

      return setState(
        message,
        "error",
        t("consentRequired")
      );
    }

    submit.disabled = true;
    submit.textContent =
      t("connecting");

    try {
      await signIn(
        inn,
        password.value
      );

      const result =
        await requireAccess();

      if (!result.ok) {
        await signOut();

        const key =
          result.reason === "blocked"
            ? "blocked"
            : result.reason ===
                "configuration"
              ? "configMissing"
              : "loginDenied";

        setState(
          message,
          "error",
          t(key)
        );

        return;
      }

      location.replace(
        "./dashboard.html"
      );

    } catch (error) {
      const key =
        error.message ===
        "NOT_CONFIGURED"
          ? "configMissing"
          : "loginDenied";

      setState(
        message,
        "error",
        t(key)
      );
    } finally {
      password.value = "";
      submit.disabled = false;
      submit.textContent =
        t("connect");
    }
  }
);