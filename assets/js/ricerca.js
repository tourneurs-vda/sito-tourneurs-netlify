(() => {
  "use strict";

  const base = new URL("../../", document.currentScript.src);

  const pages = [
    "index.html",
    "concorso.html",
    "dispense.html",
    "galleria.html",
    "galleria-generale.html",
    "archivio-storico.html",
    "news.html",
    "iscrizione.html",
    "privacy.html",
    "disclaimer.html",
    ...[2014,2015,2016,2017,2018,2019,2022,2023,2024,2025]
      .map(year => `concorso-${year}.html`)
  ];

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const css = document.createElement("style");
  css.textContent = `
    .tourneurs-search-btn {
      flex:0 0 auto;
      width:44px;height:44px;
      display:grid;place-items:center;
      border:1px solid #e7dbcf;border-radius:13px;
      background:#fff;color:#201914;
      font-size:26px;cursor:pointer;
      box-shadow:0 3px 12px #00000012;
    }
    .tourneurs-search-btn:hover {background:#f3e9df}
    .tourneurs-search-overlay {
      display:none;position:fixed;inset:0;
      z-index:99999;padding:18px 12px;
      background:#160f0bc0;
      overflow-y:auto;
      align-items:flex-start;justify-content:center;
    }
    .tourneurs-search-overlay.open {display:flex}
    .tourneurs-search-panel {
      width:min(700px,100%);
      padding:22px;background:#fbf8f4;color:#201914;
      border-radius:22px;box-shadow:0 24px 80px #0005;
      font-family:inherit;
    }
    .tourneurs-search-header {
      display:flex;align-items:center;
      justify-content:space-between;gap:12px;
      margin-bottom:16px;
    }
    .tourneurs-search-header strong {font-size:1.3rem}
    .tourneurs-search-close {
      width:44px;height:44px;
      border:0;border-radius:12px;
      background:#eee3d8;font-size:25px;cursor:pointer;
    }
    .tourneurs-search-input {
      box-sizing:border-box;
      width:100%;padding:15px;
      border:1px solid #cdbbac;border-radius:12px;
      background:#fff;color:#201914;
      font:inherit;font-size:16px;
    }
    .tourneurs-search-status {
      margin:16px 0;color:#6d655e;font-size:14px;
    }
    .tourneurs-search-results {display:grid;gap:10px}
    .tourneurs-search-result {
      display:block;padding:15px;border-radius:14px;
      background:#fff;color:#201914!important;
      border:1px solid #e7dbcf;
      text-decoration:none!important;
    }
    .tourneurs-search-result:hover {border-color:#8b5b3b}
    .tourneurs-search-result strong {display:block;margin-bottom:5px}
    .tourneurs-search-result small {
      display:block;color:#6d655e;
      line-height:1.5;font-size:13px;
    }
    @media(max-width:860px) {
      .tourneurs-search-panel {padding:16px}
    }
  `;
  document.head.append(css);

  // Icona accanto alla navigazione
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "tourneurs-search-btn";
  trigger.textContent = "⌕";
  trigger.title = "Cerca nel sito";
  trigger.setAttribute("aria-label", "Cerca nel sito");

  const menu = document.getElementById("menuToggle");
  const nav = document.querySelector(".topbar .nav");

  if (menu) {
    menu.before(trigger);
  } else if (nav) {
    nav.append(trigger);
  } else {
    return;
  }

  // Finestra di ricerca
  const overlay = document.createElement("div");
  overlay.className = "tourneurs-search-overlay";
  overlay.innerHTML = `
    <div class="tourneurs-search-panel"
         role="dialog" aria-modal="true"
         aria-label="Ricerca nel sito">
      <div class="tourneurs-search-header">
        <strong>Cerca nel sito</strong>
        <button type="button" class="tourneurs-search-close"
                aria-label="Chiudi ricerca">×</button>
      </div>
      <input type="search" class="tourneurs-search-input"
             placeholder="Cerca concorsi, dispense, news…"
             aria-label="Parole da cercare">
      <p class="tourneurs-search-status" aria-live="polite">
        Scrivi almeno due caratteri.
      </p>
      <div class="tourneurs-search-results"></div>
    </div>
  `;
  document.body.append(overlay);

  const input = overlay.querySelector(".tourneurs-search-input");
  const status = overlay.querySelector(".tourneurs-search-status");
  const results = overlay.querySelector(".tourneurs-search-results");
  const closeButton = overlay.querySelector(".tourneurs-search-close");

  let documents = [];
  let loading = null;
  let lastFocus = null;

  async function readPage(path) {
    const url = new URL(path, base);
    const response = await fetch(url);
    if (!response.ok) throw new Error(path);

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const main = parsed.querySelector("main") || parsed.body;

    main.querySelectorAll(
      "script,style,nav,footer,form,dialog"
    ).forEach(el => el.remove());

    const title = parsed.querySelector("h1")?.textContent?.trim()
      || parsed.title || path;

    return {
      title,
      text: main.textContent.replace(/\s+/g," ").trim(),
      url: url.href,
      type: path.startsWith("concorso-") ? "Concorso" : "Pagina"
    };
  }

  async function readNews() {
    const response = await fetch(
      new URL("content/news.json", base),
      {cache:"no-store"}
    );
    if (!response.ok) throw new Error("News");

    const payload = await response.json();

    return (payload.articles || [])
      .filter(a => a && a.published !== false && a.title && a.date)
      .map(a => {
        const explicit = String(a.slug || "").toLowerCase().trim();
        const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(explicit)
          ? explicit
          : normalize(a.title).replace(/[^a-z0-9]+/g,"-")
              .replace(/^-+|-+$/g,"");

        return {
          title: a.title,
          text: [a.title,a.category,a.summary,a.body]
            .filter(Boolean).join(" "),
          url: new URL(
            "news-articolo.html?articolo=" + encodeURIComponent(slug),
            base
          ).href,
          type: "News"
        };
      });
  }

  function loadDocuments() {
    if (loading) return loading;

    const tasks = [
      ...pages.map(readPage),
      readNews()
    ];

    loading = Promise.all(
      tasks.map(task => task.catch(() => null))
    ).then(data => {
      documents = data.flat().filter(Boolean);
    });

    return loading;
  }

  function search() {
    results.replaceChildren();
    const query = input.value.trim();

    if (query.length < 2) {
      status.textContent = "Scrivi almeno due caratteri.";
      return;
    }

    const words = normalize(query).split(/\s+/).filter(Boolean);

    const found = documents.filter(doc => {
      const text = normalize(doc.title + " " + doc.text);
      return words.every(word => text.includes(word));
    });

    found.sort((a,b) =>
      Number(normalize(b.title).includes(normalize(query))) -
      Number(normalize(a.title).includes(normalize(query)))
    );

    status.textContent = found.length
      ? `${found.length} risultati trovati`
      : "Nessun risultato trovato.";

    for (const doc of found.slice(0,30)) {
      const link = document.createElement("a");
      link.className = "tourneurs-search-result";
      link.href = doc.url;

      const heading = document.createElement("strong");
      heading.textContent = doc.title;

      const description = document.createElement("small");
      const position = normalize(doc.text).indexOf(words[0]);
      const start = Math.max(0,position - 50);
      description.textContent = doc.type + " · " +
        (start ? "…" : "") +
        doc.text.slice(start,start + 155) + "…";

      link.append(heading,description);
      results.append(link);
    }
  }

  function closeSearch() {
    overlay.classList.remove("open");
    document.body.style.removeProperty("overflow");
    lastFocus?.focus();
  }

  trigger.addEventListener("click", async () => {
    lastFocus = document.activeElement;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    input.focus();

    status.textContent = "Caricamento della ricerca…";

    try {
      await loadDocuments();
      if (overlay.classList.contains("open")) search();
    } catch {
      status.textContent = "Impossibile caricare la ricerca.";
    }
  });

  input.addEventListener("input", () => {
    if (loading) loading.then(search);
  });

  closeButton.addEventListener("click",closeSearch);

  overlay.addEventListener("click",event => {
    if (event.target === overlay) closeSearch();
  });

  document.addEventListener("keydown",event => {
    if (!overlay.classList.contains("open")) return;

    if (event.key === "Escape") {
      closeSearch();
      return;
    }

    // Mantiene il focus dentro la finestra
    if (event.key === "Tab") {
      const elements = [
        closeButton,input,...results.querySelectorAll("a")
      ];
      const first = elements[0];
      const last = elements[elements.length-1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();