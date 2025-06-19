/**
 * 目次ナビゲーションコンポーネント
 * マークダウンの見出しから目次を生成し、ナビゲーション機能を提供
 */
export class TocNavigation extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.headings = [];
    this.activeId = null;
  }
  
  connectedCallback() {
    this.render();
    this.setupScrollListener();
  }
  
  disconnectedCallback() {
    this.removeScrollListener();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        .toc-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }
        
        .toc-header h2 {
          font-size: 1rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary, #64748b);
          margin: 0;
        }
        
        .toc-content {
          padding: 1rem;
        }
        
        .toc-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .toc-item {
          margin-bottom: 0.25rem;
        }
        
        .toc-link {
          display: block;
          padding: 0.5rem 0.75rem;
          color: var(--text-color, #1e293b);
          text-decoration: none;
          border-radius: 4px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .toc-link:hover {
          background: var(--hover-color, #f1f5f9);
          color: var(--primary-color, #3b82f6);
        }
        
        .toc-link.active {
          background: #eff6ff;
          color: var(--primary-color, #3b82f6);
          font-weight: 500;
        }
        
        /* インデント処理 */
        .toc-h1 { padding-left: 0; }
        .toc-h2 { padding-left: 1rem; }
        .toc-h3 { padding-left: 2rem; }
        .toc-h4 { padding-left: 3rem; }
        .toc-h5 { padding-left: 4rem; }
        .toc-h6 { padding-left: 5rem; }
        
        /* 空の状態 */
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-secondary, #64748b);
          font-size: 0.875rem;
        }
      </style>
      
      <div class="toc-header">
        <h2>目次</h2>
      </div>
      
      <nav class="toc-content">
        <ul class="toc-list"></ul>
        <div class="empty-state" style="display: none;">
          コンテンツが読み込まれていません
        </div>
      </nav>
    `;
  }
  
  setHeadings(headings) {
    this.headings = headings;
    this.updateToc();
  }
  
  updateToc() {
    const tocList = this.shadowRoot.querySelector('.toc-list');
    const emptyState = this.shadowRoot.querySelector('.empty-state');
    
    if (!this.headings || this.headings.length === 0) {
      tocList.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';
    
    // 目次を生成
    tocList.innerHTML = this.headings.map(heading => `
      <li class="toc-item toc-h${heading.level}">
        <a class="toc-link" data-id="${heading.id}" href="#${heading.id}">
          ${heading.text}
        </a>
      </li>
    `).join('');
    
    // クリックイベントを設定
    const links = tocList.querySelectorAll('.toc-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('data-id');
        this.scrollToHeading(id);
      });
    });
  }
  
  scrollToHeading(id) {
    // スクロールイベントを発火
    this.dispatchEvent(new CustomEvent('toc-navigate', {
      detail: { headingId: id },
      bubbles: true,
      composed: true
    }));
    
    // アクティブ状態を更新
    this.setActiveHeading(id);
    
    // 実際のスクロール処理
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  setActiveHeading(id) {
    this.activeId = id;
    const links = this.shadowRoot.querySelectorAll('.toc-link');
    
    links.forEach(link => {
      if (link.getAttribute('data-id') === id) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  
  setupScrollListener() {
    // メインコンテンツのスクロールを監視
    this.scrollHandler = () => {
      this.updateActiveHeading();
    };
    
    // コンテンツエリアを探してリスナーを設定
    setTimeout(() => {
      const contentArea = document.querySelector('.content-area') || 
                         document.querySelector('markdown-content')?.parentElement;
      if (contentArea) {
        contentArea.addEventListener('scroll', this.scrollHandler);
      }
    }, 100);
  }
  
  removeScrollListener() {
    if (this.scrollHandler) {
      const contentArea = document.querySelector('.content-area') || 
                         document.querySelector('markdown-content')?.parentElement;
      if (contentArea) {
        contentArea.removeEventListener('scroll', this.scrollHandler);
      }
    }
  }
  
  updateActiveHeading() {
    if (!this.headings || this.headings.length === 0) return;
    
    // 現在のスクロール位置を取得
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    let activeId = null;
    
    // 逆順で探索（下から上へ）
    for (let i = this.headings.length - 1; i >= 0; i--) {
      const heading = this.headings[i];
      const element = document.getElementById(heading.id);
      
      if (element && element.offsetTop <= scrollTop + 100) {
        activeId = heading.id;
        break;
      }
    }
    
    if (activeId && activeId !== this.activeId) {
      this.setActiveHeading(activeId);
    }
  }
}

// カスタム要素として登録
customElements.define('toc-navigation', TocNavigation);