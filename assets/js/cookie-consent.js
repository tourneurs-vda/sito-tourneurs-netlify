(() => {
  "use strict";

  const MEASUREMENT_ID = "G-Q07LS9Z1VQ";
  const KEY = "tourneurs.analytics.consent.v1";
  const POLICY = "privacy.html";
  let analyticsLoaded = false;

  const style = document.createElement("style");
  style.textContent = `
    .tc-cookie-banner {
      position:fixed;z-index:99998;
      bottom:16px;left:16px;right:16px;
      max-width:570px;margin:auto;
      background:#fffaf5;color:#201914;
      border:1px solid #ddcbbd;
      border-radius:18px;padding:20px;
      box-shadow:0 15px 55px #0004;
      font-family:inherit;line-height:1.5;
    }
    .tc-cookie-banner h2 {
      font-size:1.2rem;line-height:1.3;
      margin:0 0 8px;color:#201914;
    }
    .tc-cookie-banner p {
      font-size:14px;margin:0 0 14px;
      color:#51443a;
    }
    .tc-cookie-banner a {
      color:#75482e;text-decoration:underline;
    }
    .tc-cookie-actions {
      display:flex;gap:10px;flex-wrap:wrap;
    }
    .tc-cookie-actions button {
      flex:1;min-height:44px;padding:10px 16px;
      border-radius:12px;cursor:pointer;
      font:700 14px inherit;
      font-family:inherit;
      font-size:14px;font-weight:700;
    }
    .tc-accept {
      background:#8b5b3b;color:white;
      border:1px solid #8b5b3b;
    }
    .tc-reject {
      background:white;color:#201914;
      border:1px solid #c8b8ab;
    }
    .tc-cookie-settings {
      /* TOURNEURS_COOKIE_FOOTER_V1 */
      display:inline-block !important;
      position:static !important;
      padding:0;
      margin:0;
      border:0;
      border-radius:0;
      background:transparent;
      box-shadow:none;
      color:inherit;
      font:inherit;
      font-size:inherit;
      font-weight:inherit;
      text-decoration:underline;
      text-underline-offset:3px;
      cursor:pointer;
    }
    @media(max-width:550px) {
      .tc-cookie-banner {
        bottom:10px;left:10px;right:10px;
        padding:16px;
      }
    }
  `;
  document.head.append(style);

  const banner = document.createElement("section");
  banner.className = "tc-cookie-banner";
  banner.setAttribute("aria-label", "Preferenze cookie");
  banner.innerHTML = `
    <h2>Cookie e statistiche</h2>
    <p>
      Utilizziamo Google Analytics per capire come
      viene visitato il sito. I cookie statistici
      vengono attivati soltanto con il tuo consenso.
      Puoi rifiutare senza limitazioni.
      <a href="${POLICY}">Informativa Privacy</a>
    </p>
    <div class="tc-cookie-actions">
      <button type="button" class="tc-reject">
        Rifiuta
      </button>
      <button type="button" class="tc-accept">
        Accetta
      </button>
    </div>
  `;

  const settings = document.createElement("button");
  settings.className = "tc-cookie-settings";
  settings.type = "button";
  settings.textContent = "Preferenze cookie";
  settings.setAttribute("aria-label", "Modifica preferenze cookie");

  function choice() {
    try { return localStorage.getItem(KEY); }
    catch { return null; }
  }

  function store(value) {
    try { localStorage.setItem(KEY, value); }
    catch { /* Nessun consenso persistente */ }
  }

  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    // Consenso solo per le statistiche
    gtag("js", new Date());
    gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    gtag("config", MEASUREMENT_ID);

    const script = document.createElement("script");
    script.async = true;
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(MEASUREMENT_ID);
    document.head.append(script);
  }

  function eraseAnalyticsCookies() {
    const names = document.cookie.split(";")
      .map(c => c.split("=")[0].trim())
      .filter(n => n === "_ga" || n.startsWith("_ga_"));

    const host = location.hostname;
    const domains = [
      "",
      host,
      "." + host,
      host.replace(/^www\./, ""),
      "." + host.replace(/^www\./, "")
    ];

    for (const name of names) {
      for (const domain of new Set(domains)) {
        document.cookie = name +
          "=; Max-Age=0; path=/; SameSite=Lax" +
          (domain ? "; domain=" + domain : "");
      }
    }
  }

  function saveChoice(accepted) {
    store(accepted ? "yes" : "no");
    banner.remove();

    if (accepted) {
      loadAnalytics();
    } else {
      eraseAnalyticsCookies();

      // In caso di revoca, interrompe la sessione attuale
      if (analyticsLoaded) location.reload();
    }
  }

  banner.querySelector(".tc-accept")
    .addEventListener("click", () => saveChoice(true));

  banner.querySelector(".tc-reject")
    .addEventListener("click", () => saveChoice(false));

  settings.addEventListener("click", () => {
    if (!banner.isConnected) document.body.append(banner);
    banner.querySelector(".tc-reject").focus();
  });

  function init() {
    const footerLinks = document.querySelector(".footer-links");
    const footerLine = document.querySelector(".footer-line");
    const footerElement = document.querySelector("footer");

    if (footerLinks) {
      const separator = document.createElement("span");
      separator.textContent = " \u00B7 ";
      separator.setAttribute("aria-hidden", "true");
      footerLinks.append(separator, settings);
    } else if (footerLine) {
      const separator = document.createElement("span");
      separator.textContent = " Â· ";
      separator.setAttribute("aria-hidden", "true");
      footerLine.append(separator, settings);
    } else {
      const footer = document.createElement("div");
      footer.className = "tc-cookie-footer";
      footer.style.cssText =
        "padding:24px 16px;text-align:center;font-size:14px;" +
        "background:#fbf8f4;color:#51443a;";
      footer.append(settings);

      if (footerElement) {
        footerElement.append(footer);
      } else {
        (document.querySelector("main") || document.body)
          .append(footer);
      }
    }

    const saved = choice();
    if (saved === "yes") {
      loadAnalytics();
    } else if (saved !== "no") {
      document.body.append(banner);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();