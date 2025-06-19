/**
 * マークダウンコンテンツ表示コンポーネント
 * マークダウンのレンダリングと表示を担当
 */
export class MarkdownContent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.headings = [];
  }
  
  connectedCallback() {
    this.render();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          color: var(--text-color, #1e293b);
          line-height: 1.6;
        }
        
        /* マークダウン要素のスタイル */
        ::slotted(h1),
        ::slotted(h2),
        ::slotted(h3),
        ::slotted(h4),
        ::slotted(h5),
        ::slotted(h6) {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 600;
          position: relative;
          cursor: pointer;
        }
        
        ::slotted(h1) { font-size: 2rem; }
        ::slotted(h2) { font-size: 1.5rem; }
        ::slotted(h3) { font-size: 1.25rem; }
        ::slotted(h4) { font-size: 1.125rem; }
        ::slotted(h5) { font-size: 1rem; }
        ::slotted(h6) { font-size: 0.875rem; }
        
        ::slotted(p) {
          margin-bottom: 1rem;
        }
        
        ::slotted(img) {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        ::slotted(img:hover) {
          transform: scale(1.02);
        }
        
        ::slotted(code) {
          background: var(--code-bg, #f6f8fa);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: "SF Mono", Monaco, Consolas, monospace;
          font-size: 0.875rem;
        }
        
        ::slotted(pre) {
          background: var(--code-bg, #f6f8fa);
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin-bottom: 1rem;
        }
        
        ::slotted(pre code) {
          background: none;
          padding: 0;
        }
        
        ::slotted(blockquote) {
          border-left: 4px solid var(--primary-color, #3b82f6);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--text-secondary, #64748b);
        }
        
        ::slotted(table) {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1rem;
        }
        
        ::slotted(th),
        ::slotted(td) {
          border: 1px solid var(--border-color, #e2e8f0);
          padding: 0.75rem;
          text-align: left;
        }
        
        ::slotted(th) {
          background: var(--hover-color, #f1f5f9);
          font-weight: 600;
        }
        
        ::slotted(ul),
        ::slotted(ol) {
          margin-bottom: 1rem;
          padding-left: 2rem;
        }
        
        ::slotted(li) {
          margin-bottom: 0.25rem;
        }
        
        /* Mermaidダイアグラム */
        ::slotted(.mermaid) {
          text-align: center;
          margin: 1rem 0;
          background: var(--hover-color, #f1f5f9);
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        ::slotted(.mermaid:hover) {
          transform: scale(1.02);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        /* 折りたたみ見出し */
        ::slotted(.collapsible-heading) {
          padding-left: 1.5rem;
        }
        
        /* コンテンツラッパー */
        .content-wrapper {
          position: relative;
        }
      </style>
      
      <div class="content-wrapper">
        <slot></slot>
      </div>
    `;
  }
  
  async setContent(markdownText) {
    try {
      // marked.jsが読み込まれているか確認
      if (typeof marked === 'undefined') {
        throw new Error('marked.js is not loaded');
      }
      
      // マークダウンをパース
      const html = await this.parseMarkdown(markdownText);
      
      // コンテンツを設定
      this.innerHTML = html;
      
      // 後処理
      this.postProcess();
      
      // コンテンツ更新イベントを発火
      this.dispatchEvent(new CustomEvent('content-updated', {
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      console.error('Error rendering markdown:', error);
      this.innerHTML = '<p>マークダウンの表示中にエラーが発生しました</p>';
    }
  }
  
  async parseMarkdown(markdown) {
    // カスタムレンダラーの設定
    const renderer = new marked.Renderer();
    let headingIndex = 0;
    
    // 見出しに折りたたみ機能を追加
    renderer.heading = (text, level) => {
      const id = `heading-${headingIndex++}`;
      const toggleIcon = `<span class="heading-toggle" data-target="${id}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>`;
      
      // 見出しを記録
      this.headings.push({ id, text, level });
      
      return `<h${level} id="${id}" class="collapsible-heading" data-text="${text}">${toggleIcon}${text}</h${level}>`;
    };
    
    // 画像にクラスを追加
    renderer.image = (href, title, text) => {
      return `<img src="${href}" alt="${text}" title="${title || ''}" class="markdown-image" loading="lazy" />`;
    };
    
    // コードブロックの処理
    renderer.code = (code, language) => {
      if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`;
      }
      
      // highlight.jsが利用可能な場合
      if (typeof hljs !== 'undefined' && language) {
        try {
          const highlighted = hljs.highlight(code, { language }).value;
          return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
        } catch (e) {
          // エラー時はそのまま表示
        }
      }
      
      return `<pre><code class="language-${language || ''}">${code}</code></pre>`;
    };
    
    // marked.jsの設定
    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true
    });
    
    return marked.parse(markdown);
  }
  
  postProcess() {
    // Mermaidダイアグラムの初期化
    if (typeof mermaid !== 'undefined') {
      mermaid.init(undefined, this.querySelectorAll('.mermaid'));
    }
    
    // 折りたたみ機能の初期化
    this.initializeCollapsible();
    
    // 画像のライトボックス化
    this.initializeImageLightbox();
  }
  
  initializeCollapsible() {
    const headings = this.querySelectorAll('.collapsible-heading');
    
    headings.forEach((heading) => {
      const toggle = heading.querySelector('.heading-toggle');
      if (!toggle) return;
      
      // 見出しの次の要素を取得
      const content = this.getHeadingContent(heading);
      if (content.length > 0) {
        // コンテンツをラップ
        const wrapper = document.createElement('div');
        wrapper.className = 'heading-content';
        content.forEach(el => wrapper.appendChild(el));
        heading.insertAdjacentElement('afterend', wrapper);
        
        // クリックイベント
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          toggle.classList.toggle('collapsed');
          wrapper.classList.toggle('collapsed');
        });
        
        heading.addEventListener('click', (e) => {
          if (e.target !== toggle && !toggle.contains(e.target)) {
            toggle.click();
          }
        });
      }
    });
  }
  
  getHeadingContent(heading) {
    const level = parseInt(heading.tagName.substring(1));
    const content = [];
    let sibling = heading.nextElementSibling;
    
    while (sibling) {
      if (sibling.classList.contains('heading-content')) {
        sibling = sibling.nextElementSibling;
        continue;
      }
      
      if (sibling.tagName.match(/^H[1-6]$/)) {
        const siblingLevel = parseInt(sibling.tagName.substring(1));
        if (siblingLevel <= level) {
          break;
        }
      }
      
      content.push(sibling);
      sibling = sibling.nextElementSibling;
    }
    
    return content;
  }
  
  initializeImageLightbox() {
    const images = this.querySelectorAll('.markdown-image');
    images.forEach(img => {
      img.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('image-clicked', {
          detail: { src: img.src, alt: img.alt },
          bubbles: true,
          composed: true
        }));
      });
    });
  }
  
  getHeadings() {
    return this.headings;
  }
}

// カスタム要素として登録
customElements.define('markdown-content', MarkdownContent);