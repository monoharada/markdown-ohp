import { eventBus } from './EventBus.js';

/**
 * マークダウンレンダリングモジュール
 * marked.js と Mermaid の統合
 */
export class MarkdownRenderer {
  constructor() {
    this.headingIndex = 0;
    this.renderer = null;
    // marked.js はグローバルスコープから使用
    if (typeof marked !== 'undefined') {
      this.setupMarked();
    }
  }

  /**
   * marked.js の設定
   */
  setupMarked() {
    marked.setOptions({
      highlight: this.highlightCode.bind(this),
      breaks: true,
      gfm: true
    });

    // カスタムレンダラーの設定
    this.renderer = new marked.Renderer();
    this.setupCustomRenderers();
  }

  /**
   * コードハイライト処理
   */
  highlightCode(code, lang) {
    if (typeof hljs === 'undefined') return code;

    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch (error) {
      console.error('Highlight error:', error);
      return code;
    }
  }

  /**
   * カスタムレンダラーの設定
   */
  setupCustomRenderers() {
    // 見出しレンダラー
    this.renderer.heading = (token) => {
      const id = `heading-${this.headingIndex++}`;
      const level = token.depth || 1;
      const text = token.text || '';
      
      const toggleIcon = `<span class="heading-toggle" data-target="${id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>`;
      
      return `<h${level} id="${id}" class="collapsible-heading" data-text="${text}">${toggleIcon}${text}</h${level}>`;
    };

    // 画像レンダラー
    this.renderer.image = (token) => {
      const src = token.href || '';
      const alt = token.text || '';
      const title = token.title || '';
      return `<img src="${src}" alt="${alt}" title="${title}" class="markdown-image" loading="lazy" />`;
    };

    // コードブロックレンダラー
    this.renderer.code = (token) => {
      const code = token.text || '';
      const language = token.lang || '';
      
      if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`;
      }
      
      const highlighted = this.highlightCode(code, language);
      const langClass = language ? `language-${language}` : '';
      return `<pre><code class="hljs ${langClass}">${highlighted}</code></pre>`;
    };
  }

  /**
   * マークダウンをHTMLにレンダリング
   * @param {string} markdown
   * @returns {string}
   */
  render(markdown) {
    if (typeof marked === 'undefined') {
      console.error('marked.js is not available');
      return '<p>Error: Markdown parser not loaded</p>';
    }
    
    // 初回実行時にセットアップ
    if (!this.renderer) {
      this.setupMarked();
    }
    
    this.headingIndex = 0; // リセット
    const html = marked.parse(markdown, { renderer: this.renderer });
    
    // レンダリング完了イベント
    eventBus.emit('markdown:rendered', { html });
    
    return html;
  }

  /**
   * 目次を生成
   * @param {HTMLElement} container
   * @returns {Array}
   */
  generateTOC(container) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const tocItems = [];

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.substring(1));
      const text = heading.getAttribute('data-text') || heading.textContent;
      const id = heading.id;
      
      tocItems.push({ id, text, level });
    });

    eventBus.emit('toc:generated', { items: tocItems });
    return tocItems;
  }
}