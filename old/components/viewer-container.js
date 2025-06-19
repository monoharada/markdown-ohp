/**
 * ビューアーコンテナコンポーネント
 * マークダウンコンテンツの表示と関連機能を管理
 */
export class ViewerContainer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this.state = {
      fileName: '',
      content: '',
      isTocVisible: true
    };
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }
  
  disconnectedCallback() {
    this.removeEventListeners();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          background: var(--background-color, #f8fafc);
        }
        
        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: var(--surface-color, #ffffff);
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .file-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color, #1e293b);
          margin: 0;
        }
        
        .header-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .btn {
          background: var(--surface-color, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 6px;
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn:hover {
          background: var(--hover-color, #f1f5f9);
          border-color: var(--secondary-color, #64748b);
        }
        
        .btn svg {
          width: 20px;
          height: 20px;
        }
        
        .viewer-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .toc-sidebar {
          width: 300px;
          background: var(--surface-color, #ffffff);
          border-right: 1px solid var(--border-color, #e2e8f0);
          overflow-y: auto;
          transition: margin-left 0.3s ease;
        }
        
        .toc-sidebar.hidden {
          margin-left: -300px;
        }
        
        .content-area {
          flex: 1;
          overflow-y: auto;
          background: var(--surface-color, #ffffff);
          padding: 2rem 3rem;
        }
        
        @media (max-width: 768px) {
          .viewer-header {
            padding: 1rem;
          }
          
          .toc-sidebar {
            position: absolute;
            z-index: 100;
            height: 100%;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }
          
          .content-area {
            padding: 1.5rem;
          }
        }
      </style>
      
      <header class="viewer-header">
        <h1 class="file-name"></h1>
        <div class="header-actions">
          <button class="btn" id="toggle-toc" title="目次の表示/非表示">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
          
          <button class="btn" id="export-pdf" title="PDFエクスポート">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </button>
          
          <button class="btn" id="new-file" title="新しいファイルを開く">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
          </button>
        </div>
      </header>
      
      <div class="viewer-content">
        <aside class="toc-sidebar">
          <toc-navigation></toc-navigation>
        </aside>
        
        <main class="content-area">
          <markdown-content></markdown-content>
        </main>
      </div>
    `;
  }
  
  setupEventListeners() {
    // 目次トグル
    const tocToggle = this.shadowRoot.getElementById('toggle-toc');
    tocToggle?.addEventListener('click', () => this.toggleToc());
    
    // PDFエクスポート
    const exportPdf = this.shadowRoot.getElementById('export-pdf');
    exportPdf?.addEventListener('click', () => this.exportToPdf());
    
    // 新規ファイル
    const newFile = this.shadowRoot.getElementById('new-file');
    newFile?.addEventListener('click', () => this.closeViewer());
  }
  
  removeEventListeners() {
    // 必要に応じて実装
  }
  
  setContent({ fileName, content, lastModified }) {
    this.state.fileName = fileName;
    this.state.content = content;
    
    // ファイル名を更新
    const fileNameEl = this.shadowRoot.querySelector('.file-name');
    if (fileNameEl) {
      fileNameEl.textContent = fileName;
    }
    
    // コンテンツを設定
    const markdownContent = this.shadowRoot.querySelector('markdown-content');
    if (markdownContent) {
      markdownContent.setContent(content);
    }
    
    // 目次を更新
    const tocNavigation = this.shadowRoot.querySelector('toc-navigation');
    if (tocNavigation) {
      // マークダウンコンテンツから見出しを抽出して目次を更新
      setTimeout(() => {
        const headings = markdownContent.getHeadings();
        tocNavigation.setHeadings(headings);
      }, 100);
    }
  }
  
  toggleToc() {
    const sidebar = this.shadowRoot.querySelector('.toc-sidebar');
    sidebar?.classList.toggle('hidden');
    this.state.isTocVisible = !this.state.isTocVisible;
  }
  
  exportToPdf() {
    // 印刷前の準備
    this.dispatchEvent(new CustomEvent('before-print', {
      bubbles: true,
      composed: true
    }));
    
    // 印刷ダイアログを開く
    window.print();
    
    // 印刷後の処理
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('after-print', {
        bubbles: true,
        composed: true
      }));
    }, 1000);
  }
  
  closeViewer() {
    this.dispatchEvent(new CustomEvent('viewer-close', {
      bubbles: true,
      composed: true
    }));
  }
}

// カスタム要素として登録
customElements.define('viewer-container', ViewerContainer);