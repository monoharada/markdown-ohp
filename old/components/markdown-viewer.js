import { eventBus } from '../modules/EventBus.js';

/**
 * マークダウンビューアーのWeb Component
 * カスタム要素として実装
 */
export class MarkdownViewer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  /**
   * コンポーネントがDOMに追加された時
   */
  connectedCallback() {
    this.setupEventListeners();
  }

  /**
   * コンポーネントがDOMから削除された時
   */
  disconnectedCallback() {
    this.removeEventListeners();
  }

  /**
   * 初期レンダリング
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        .viewer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-color, #f9fafb);
        }
        
        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .file-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }
        
        .header-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .viewer-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .markdown-content {
          flex: 1;
          overflow-y: auto;
          padding: 2rem 3rem;
          background: white;
          margin: 1rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .hidden {
          display: none;
        }
      </style>
      
      <div class="viewer">
        <header class="viewer-header">
          <h1 class="file-name"></h1>
          <div class="header-actions">
            <slot name="actions"></slot>
          </div>
        </header>
        
        <div class="viewer-content">
          <slot name="sidebar"></slot>
          <main class="markdown-content">
            <slot name="content"></slot>
          </main>
        </div>
      </div>
    `;
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    this.handleFileLoaded = this.onFileLoaded.bind(this);
    this.handleContentUpdated = this.onContentUpdated.bind(this);
    
    eventBus.on('file:loaded', this.handleFileLoaded);
    eventBus.on('content:updated', this.handleContentUpdated);
  }

  /**
   * イベントリスナーの削除
   */
  removeEventListeners() {
    eventBus.off('file:loaded', this.handleFileLoaded);
    eventBus.off('content:updated', this.handleContentUpdated);
  }

  /**
   * ファイル読み込み時の処理
   */
  onFileLoaded(event) {
    const { fileName } = event.detail;
    const fileNameElement = this.shadowRoot.querySelector('.file-name');
    fileNameElement.textContent = fileName;
  }

  /**
   * コンテンツ更新時の処理
   */
  onContentUpdated(event) {
    const { content } = event.detail;
    this.dispatchEvent(new CustomEvent('content-updated', { 
      detail: { content },
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * ビューアーの表示/非表示
   */
  set visible(value) {
    this.style.display = value ? 'block' : 'none';
  }

  get visible() {
    return this.style.display !== 'none';
  }
}

// カスタム要素として登録
customElements.define('markdown-viewer', MarkdownViewer);