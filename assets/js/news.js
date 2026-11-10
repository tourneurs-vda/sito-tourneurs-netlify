(() => {
  'use strict';

  const DATA_URL = 'content/news.json';
  const DEFAULT_COVER = 'assets/img/brand/logo-concorso-torniamo.jpg';
  const ARTICLE_URL = 'news-articolo.html?articolo=';

  const slugify = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const articleSlug = article => {
    const explicitSlug = String(article.slug || '').trim().toLowerCase();
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(explicitSlug)
      ? explicitSlug
      : slugify(article.title);
  };

  const safeCover = value => {
    const path = String(value || '').trim();
    return /^\/?assets\/img\/[a-z0-9_./%+\-]+$/i.test(path) ? path : DEFAULT_COVER;
  };

  const formatDate = value => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value || '');
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const loadArticles = async () => {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Impossibile caricare le news (${response.status})`);

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.articles)) {
      throw new Error('Il file delle news non contiene un elenco valido');
    }

    return payload.articles
      .filter(article => article && article.published !== false && article.title && article.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  };

  const createCard = article => {
    const card = document.createElement('article');
    card.className = 'surface news-card';

    const link = document.createElement('a');
    link.className = 'news-card-link';
    link.href = `${ARTICLE_URL}${encodeURIComponent(articleSlug(article))}`;

    const cover = document.createElement('div');
    cover.className = 'news-cover';
    cover.style.backgroundImage = `url("${safeCover(article.cover)}")`;
    cover.setAttribute('role', 'img');
    cover.setAttribute('aria-label', article.cover_alt || `Immagine della news: ${article.title}`);

    const content = document.createElement('div');
    content.className = 'news-content';

    const category = document.createElement('span');
    category.className = 'tag';
    category.textContent = article.category || 'News';

    const date = document.createElement('time');
    date.dateTime = article.date;
    date.textContent = formatDate(article.date);

    const title = document.createElement('h3');
    title.textContent = article.title;

    const summary = document.createElement('p');
    summary.textContent = article.summary || '';

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const button = document.createElement('span');
    button.className = 'btn btn-primary';
    button.textContent = 'Leggi articolo';
    actions.append(button);

    content.append(category, date, title, summary, actions);
    link.append(cover, content);
    card.append(link);
    return card;
  };

  const renderList = (grid, articles) => {
    grid.replaceChildren();

    if (!articles.length) {
      const message = document.createElement('p');
      message.className = 'muted';
      message.textContent = 'Non ci sono news pubblicate.';
      grid.append(message);
      return;
    }

    const fragment = document.createDocumentFragment();
    articles.forEach(article => fragment.append(createCard(article)));
    grid.append(fragment);
  };

  const renderLatest = (container, article) => {
    if (!article) return;

    const category = container.querySelector('[data-news-category]');
    const title = container.querySelector('[data-news-title]');
    const summary = container.querySelector('[data-news-summary]');
    const link = container.querySelector('[data-news-link]');

    if (category) category.textContent = article.category || 'News';
    if (title) title.textContent = article.title;
    if (summary) summary.textContent = article.summary || '';
    if (link) link.href = `${ARTICLE_URL}${encodeURIComponent(articleSlug(article))}`;
  };

  const safeLink = value => {
    const href = String(value || '').trim();
    if (/^(https?:\/\/|mailto:|#|\/[^/]|\.\.?\/)/i.test(href)) return href;
    if (/^[a-z0-9][a-z0-9._/\-]*(?:\?[a-z0-9%&=._\-]*)?(?:#[a-z0-9._\-]*)?$/i.test(href)) return href;
    return '';
  };

  const appendInline = (parent, value) => {
    const text = String(value || '');
    const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
    let cursor = 0;
    let match;

    while ((match = tokenPattern.exec(text)) !== null) {
      if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
      const token = match[0];

      if (token.startsWith('**') || token.startsWith('__')) {
        const strong = document.createElement('strong');
        strong.textContent = token.slice(2, -2);
        parent.append(strong);
      } else if (token.startsWith('*') || token.startsWith('_')) {
        const emphasis = document.createElement('em');
        emphasis.textContent = token.slice(1, -1);
        parent.append(emphasis);
      } else {
        const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        const href = linkMatch ? safeLink(linkMatch[2]) : '';
        if (!linkMatch || !href) {
          parent.append(document.createTextNode(linkMatch ? linkMatch[1] : token));
        } else {
          const anchor = document.createElement('a');
          anchor.href = href;
          anchor.textContent = linkMatch[1];
          if (/^https?:\/\//i.test(href)) {
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
          }
          parent.append(anchor);
        }
      }

      cursor = tokenPattern.lastIndex;
    }

    if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
  };

  const renderMarkdown = (container, markdown) => {
    const lines = String(markdown || '').replace(/\r/g, '').split('\n');
    const fragment = document.createDocumentFragment();
    const startsBlock = line => /^(#{2,3}|[-*]|\d+\.)\s+/.test(line.trim());
    let index = 0;

    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line) {
        index += 1;
        continue;
      }

      const heading = line.match(/^(#{2,3})\s+(.+)$/);
      if (heading) {
        const element = document.createElement(heading[1].length === 2 ? 'h2' : 'h3');
        appendInline(element, heading[2]);
        fragment.append(element);
        index += 1;
        continue;
      }

      const unordered = line.match(/^[-*]\s+(.+)$/);
      const ordered = line.match(/^\d+\.\s+(.+)$/);
      if (unordered || ordered) {
        const list = document.createElement(unordered ? 'ul' : 'ol');
        const matcher = unordered ? /^[-*]\s+(.+)$/ : /^\d+\.\s+(.+)$/;
        while (index < lines.length) {
          const itemMatch = lines[index].trim().match(matcher);
          if (!itemMatch) break;
          const item = document.createElement('li');
          appendInline(item, itemMatch[1]);
          list.append(item);
          index += 1;
        }
        fragment.append(list);
        continue;
      }

      const paragraphLines = [line];
      index += 1;
      while (index < lines.length && lines[index].trim() && !startsBlock(lines[index])) {
        paragraphLines.push(lines[index].trim());
        index += 1;
      }
      const paragraph = document.createElement('p');
      appendInline(paragraph, paragraphLines.join(' '));
      fragment.append(paragraph);
    }

    container.replaceChildren(fragment);
  };

  const showArticleError = message => {
    const title = document.getElementById('articleTitle');
    const summary = document.getElementById('articleSummary');
    const content = document.getElementById('articleContent');
    if (title) title.textContent = 'Articolo non trovato';
    if (summary) summary.textContent = message;
    if (content) content.replaceChildren();
    document.title = 'Articolo non trovato — Les Tourneurs de la Basse Vallée';
  };

  const renderArticle = (articles) => {
    const fixedSlug = document.body.dataset.newsSlug;
    const requestedSlug = fixedSlug || new URLSearchParams(window.location.search).get('articolo');
    if (!requestedSlug) {
      showArticleError('Nessun articolo è stato specificato. Torna all’elenco delle news.');
      return;
    }

    const article = articles.find(item => articleSlug(item) === requestedSlug);
    if (!article) {
      showArticleError('La news richiesta non esiste oppure non è pubblicata.');
      return;
    }

    const category = document.getElementById('articleCategory');
    const title = document.getElementById('articleTitle');
    const summary = document.getElementById('articleSummary');
    const date = document.getElementById('articleDate');
    const cover = document.getElementById('articleCover');
    const content = document.getElementById('articleContent');

    if (category) category.textContent = article.category || 'News';
    if (title) title.textContent = article.title;
    if (summary) summary.textContent = article.summary || '';
    if (date) {
      date.dateTime = article.date;
      date.textContent = formatDate(article.date);
    }
    if (cover) {
      cover.style.backgroundImage = `url("${safeCover(article.cover)}")`;
      cover.setAttribute('aria-label', article.cover_alt || `Immagine della news: ${article.title}`);
    }
    if (content) renderMarkdown(content, article.body || article.summary || '');

    document.title = `${article.title} — Les Tourneurs de la Basse Vallée`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = article.summary || '';
  };

  const initialize = async () => {
    const grid = document.getElementById('newsGrid');
    const latest = document.querySelector('[data-news-latest]');
    const isArticle = document.body.dataset.newsView === 'article';
    if (!grid && !latest && !isArticle) return;

    try {
      const articles = await loadArticles();
      if (grid) renderList(grid, articles);
      if (latest) renderLatest(latest, articles[0]);
      if (isArticle) renderArticle(articles);
    } catch (error) {
      console.error(error);
      if (isArticle && !document.body.dataset.newsSlug) {
        showArticleError('Non è stato possibile caricare l’articolo. Riprova più tardi.');
      }
    }
  };

  initialize();
})();
