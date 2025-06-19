// すべてのWeb Componentsを一つのファイルにまとめる
console.log('web-components.js loaded');

/**
 * マークダウンビューアーのメインアプリケーションコンポーネント
 * 全体の状態管理とコンポーネント間の調整を行う
 */
class MarkdownViewerApp extends HTMLElement {
  constructor() {
    super();
    console.log('MarkdownViewerApp constructor called');
    this.attachShadow({ mode: 'open' });
    
    // 状態管理
    this.state = {
      currentFile: null,
      currentContent: '',
      isHotReloadEnabled: false,
      theme: 'light'
    };
    
    // イベントハンドラーのバインド
    this.handleFileSelected = this.handleFileSelected.bind(this);
    this.handleViewerClose = this.handleViewerClose.bind(this);
  }
  
  connectedCallback() {
    console.log('MarkdownViewerApp connectedCallback called');
    this.render();
    this.setupEventListeners();
    this.restoreSession();
  }
  
  disconnectedCallback() {
    this.removeEventListeners();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }
        
        .container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--background-color, #f8fafc);
        }
        
        /* コンポーネントの表示/非表示 */
        :host([mode="dropzone"]) drop-zone-component {
          display: flex;
        }
        
        :host([mode="dropzone"]) viewer-container {
          display: none;
        }
        
        :host([mode="viewer"]) drop-zone-component {
          display: none;
        }
        
        :host([mode="viewer"]) viewer-container {
          display: flex;
        }
      </style>
      
      <div class="container">
        <drop-zone-component></drop-zone-component>
        <viewer-container></viewer-container>
      </div>
    `;
    
    // デフォルトモードを設定
    this.setAttribute('mode', 'dropzone');
  }
  
  setupEventListeners() {
    // ファイル選択イベント
    this.addEventListener('file-selected', this.handleFileSelected);
    
    // ビューアー閉じるイベント
    this.addEventListener('viewer-close', this.handleViewerClose);
    
    // ホットリロード関連
    this.addEventListener('hot-reload-toggle', this.handleHotReloadToggle.bind(this));
    
    // セッション保存
    this.addEventListener('content-updated', this.saveSession.bind(this));
  }
  
  removeEventListeners() {
    this.removeEventListener('file-selected', this.handleFileSelected);
    this.removeEventListener('viewer-close', this.handleViewerClose);
  }
  
  async handleFileSelected(event) {
    const { file, source } = event.detail;
    
    try {
      // ファイル内容を読み込む
      const content = await this.readFile(file);
      
      // 状態を更新
      this.state.currentFile = file;
      this.state.currentContent = content;
      
      // ビューアーモードに切り替え
      this.setAttribute('mode', 'viewer');
      
      // ビューアーにコンテンツを設定
      const viewer = this.shadowRoot.querySelector('viewer-container');
      if (viewer) {
        viewer.setContent({
          fileName: file.name,
          content: content,
          lastModified: file.lastModified
        });
      }
      
      // セッションを保存
      this.saveSession();
      
      // ホットリロードの提案（ドロップの場合）
      if (source === 'drop' && 'showOpenFilePicker' in window) {
        this.promptHotReload(file);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      this.showNotification('ファイルの読み込みに失敗しました', 'error');
    }
  }
  
  handleViewerClose() {
    this.setAttribute('mode', 'dropzone');
    this.state.currentFile = null;
    this.state.currentContent = '';
    this.clearSession();
  }
  
  handleHotReloadToggle(event) {
    const { enabled } = event.detail;
    this.state.isHotReloadEnabled = enabled;
    
    if (enabled) {
      this.startFileWatching();
    } else {
      this.stopFileWatching();
    }
  }
  
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  
  promptHotReload(file) {
    // ホットリロード提案ダイアログを表示
    const event = new CustomEvent('hot-reload-prompt', {
      detail: { file },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
  
  startFileWatching() {
    // ファイル監視の実装
    console.log('Starting file watching...');
  }
  
  stopFileWatching() {
    // ファイル監視の停止
    console.log('Stopping file watching...');
  }
  
  saveSession() {
    const session = {
      fileName: this.state.currentFile?.name,
      content: this.state.currentContent,
      lastModified: this.state.currentFile?.lastModified,
      isHotReloadEnabled: this.state.isHotReloadEnabled,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('markdown-viewer-session', JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }
  
  restoreSession() {
    try {
      const sessionData = localStorage.getItem('markdown-viewer-session');
      if (!sessionData) return;
      
      const session = JSON.parse(sessionData);
      
      // 24時間以内のセッションのみ復元
      if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
        this.state.currentContent = session.content;
        
        // ビューアーモードで開始
        this.setAttribute('mode', 'viewer');
        
        // コンテンツを設定
        setTimeout(() => {
          const viewer = this.shadowRoot.querySelector('viewer-container');
          if (viewer) {
            viewer.setContent({
              fileName: session.fileName,
              content: session.content,
              lastModified: session.lastModified
            });
          }
          
          this.showNotification('前回のセッションを復元しました', 'success');
        }, 100);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  }
  
  clearSession() {
    localStorage.removeItem('markdown-viewer-session');
  }
  
  showNotification(message, type = 'info') {
    const event = new CustomEvent('show-notification', {
      detail: { message, type },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

/**
 * ドラッグ&ドロップゾーンコンポーネント
 * ファイルの選択とドラッグ&ドロップ機能を提供
 */
class DropZoneComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // バインド
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDragLeave = this.handleDragLeave.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleFileInput = this.handleFileInput.bind(this);
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
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 2rem;
        }
        
        .drop-zone {
          background: var(--surface-color, #ffffff);
          border: 2px dashed var(--border-color, #e2e8f0);
          border-radius: 12px;
          padding: 4rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          max-width: 600px;
          width: 100%;
        }
        
        .drop-zone:hover {
          border-color: var(--primary-color, #3b82f6);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .drop-zone.drag-over {
          border-color: var(--primary-color, #3b82f6);
          background-color: #eff6ff;
          transform: scale(1.02);
        }
        
        .upload-icon {
          width: 64px;
          height: 64px;
          color: var(--text-secondary, #64748b);
          margin: 0 auto 1rem;
        }
        
        .drop-zone-text {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color, #1e293b);
          margin: 0 0 0.5rem;
        }
        
        .drop-zone-subtext {
          color: var(--text-secondary, #64748b);
          font-size: 0.875rem;
        }
        
        input[type="file"] {
          display: none;
        }
        
        @media (max-width: 768px) {
          .drop-zone {
            padding: 2rem;
          }
          
          .drop-zone-text {
            font-size: 1rem;
          }
        }
      </style>
      
      <div class="drop-zone">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        <h2 class="drop-zone-text">マークダウンファイルをドラッグ&ドロップ</h2>
        <p class="drop-zone-subtext">または クリックしてファイルを選択（ホットリロード対応）</p>
        <input type="file" accept=".md,.markdown" />
      </div>
    `;
  }
  
  setupEventListeners() {
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    const fileInput = this.shadowRoot.querySelector('input[type="file"]');
    
    // ドラッグイベント
    dropZone.addEventListener('dragover', this.handleDragOver);
    dropZone.addEventListener('dragleave', this.handleDragLeave);
    dropZone.addEventListener('drop', this.handleDrop);
    
    // クリックイベント
    dropZone.addEventListener('click', this.handleClick);
    
    // ファイル入力イベント
    fileInput.addEventListener('change', this.handleFileInput);
  }
  
  removeEventListeners() {
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    const fileInput = this.shadowRoot.querySelector('input[type="file"]');
    
    if (dropZone) {
      dropZone.removeEventListener('dragover', this.handleDragOver);
      dropZone.removeEventListener('dragleave', this.handleDragLeave);
      dropZone.removeEventListener('drop', this.handleDrop);
      dropZone.removeEventListener('click', this.handleClick);
    }
    
    if (fileInput) {
      fileInput.removeEventListener('change', this.handleFileInput);
    }
  }
  
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    dropZone.classList.add('drag-over');
  }
  
  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    dropZone.classList.remove('drag-over');
  }
  
  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    dropZone.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    const markdownFile = files.find(file => 
      file.name.match(/\.(md|markdown)$/i)
    );
    
    if (markdownFile) {
      this.emitFileSelected(markdownFile, 'drop');
    } else {
      this.showError('マークダウンファイル（.md または .markdown）を選択してください');
    }
  }
  
  async handleClick() {
    // File System Access API が利用可能な場合
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'Markdown files',
            accept: { 'text/markdown': ['.md', '.markdown'] }
          }]
        });
        
        const file = await fileHandle.getFile();
        this.emitFileSelected(file, 'picker', fileHandle);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('File picker error:', error);
          // フォールバック
          this.triggerFileInput();
        }
      }
    } else {
      // フォールバック：通常のファイル入力を使用
      this.triggerFileInput();
    }
  }
  
  triggerFileInput() {
    const fileInput = this.shadowRoot.querySelector('input[type="file"]');
    fileInput.click();
  }
  
  handleFileInput(event) {
    const file = event.target.files[0];
    if (file && file.name.match(/\.(md|markdown)$/i)) {
      this.emitFileSelected(file, 'input');
    }
    
    // 入力をリセット（同じファイルを再選択できるように）
    event.target.value = '';
  }
  
  emitFileSelected(file, source, fileHandle = null) {
    const event = new CustomEvent('file-selected', {
      detail: { file, source, fileHandle },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
  
  showError(message) {
    const event = new CustomEvent('show-notification', {
      detail: { message, type: 'error' },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

/**
 * ビューアーコンテナコンポーネント
 * マークダウンコンテンツの表示と関連機能を管理
 */
class ViewerContainer extends HTMLElement {
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

/**
 * マークダウンコンテンツ表示コンポーネント
 * マークダウンのレンダリングと表示を担当
 */
class MarkdownContent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.headings = [];
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }
  
  disconnectedCallback() {
    this.removeEventListeners();
  }
  
  setupEventListeners() {
    // 目次ナビゲーションイベントをリッスン
    this.handleTocNavigate = (e) => {
      console.log('MarkdownContent received toc-navigate event:', e.detail);
      const { headingId } = e.detail;
      this.scrollToHeading(headingId);
    };
    
    document.addEventListener('toc-navigate', this.handleTocNavigate);
  }
  
  removeEventListeners() {
    document.removeEventListener('toc-navigate', this.handleTocNavigate);
  }
  
  scrollToHeading(id) {
    console.log('MarkdownContent scrollToHeading called with id:', id);
    
    const contentWrapper = this.shadowRoot.querySelector('.content-wrapper');
    if (!contentWrapper) {
      console.error('Content wrapper not found');
      return;
    }
    
    const target = contentWrapper.querySelector(`#${id}`);
    console.log('Target element found:', target);
    
    if (target) {
      // 方法1: scrollIntoViewを使う（最もシンプル）
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // 方法2: 親要素を遡ってスクロール可能な要素を探す
      let scrollParent = this.parentElement;
      while (scrollParent) {
        console.log('Checking scroll parent:', scrollParent);
        
        // ViewerContainerのShadow DOMまで遡る
        if (scrollParent.tagName === 'VIEWER-CONTAINER' && scrollParent.shadowRoot) {
          const contentArea = scrollParent.shadowRoot.querySelector('.content-area');
          if (contentArea) {
            console.log('Found content-area in viewer-container');
            const targetRect = target.getBoundingClientRect();
            const containerRect = contentArea.getBoundingClientRect();
            const scrollTop = contentArea.scrollTop + targetRect.top - containerRect.top - 20;
            
            contentArea.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
            break;
          }
        }
        
        scrollParent = scrollParent.parentElement || scrollParent.getRootNode()?.host;
      }
    }
  }
  
  render() {
    // highlight.jsのスタイルシートをShadow DOM内にインポート
    const highlightStyleLink = document.createElement('link');
    highlightStyleLink.rel = 'stylesheet';
    highlightStyleLink.href = 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css';
    this.shadowRoot.appendChild(highlightStyleLink);
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          color: var(--text-color, #1e293b);
          line-height: 1.6;
        }
        
        /* マークダウン要素のスタイル */
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 600;
          position: relative;
          cursor: pointer;
        }
        
        h1 { font-size: 2rem; }
        h2 { font-size: 1.5rem; }
        h3 { font-size: 1.25rem; }
        h4 { font-size: 1.125rem; }
        h5 { font-size: 1rem; }
        h6 { font-size: 0.875rem; }
        
        p {
          margin-bottom: 1rem;
        }
        
        img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        img:hover {
          transform: scale(1.02);
        }
        
        code {
          background: var(--code-bg, #f6f8fa);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: "SF Mono", Monaco, Consolas, monospace;
          font-size: 0.875rem;
        }
        
        pre {
          background: var(--code-bg, #f6f8fa);
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin-bottom: 1rem;
          border: 1px solid var(--border-color, #e2e8f0);
        }
        
        pre code {
          background: none;
          padding: 0;
          font-family: "SF Mono", Monaco, Consolas, "Courier New", monospace;
          font-size: 0.875rem;
          color: var(--text-color, #1e293b);
          display: block;
        }
        
        blockquote {
          border-left: 4px solid var(--primary-color, #3b82f6);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--text-secondary, #64748b);
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1rem;
        }
        
        th,
        td {
          border: 1px solid var(--border-color, #e2e8f0);
          padding: 0.75rem;
          text-align: left;
        }
        
        th {
          background: var(--hover-color, #f1f5f9);
          font-weight: 600;
        }
        
        ul,
        ol {
          margin-bottom: 1rem;
          padding-left: 2rem;
        }
        
        li {
          margin-bottom: 0.25rem;
        }
        
        /* Mermaidダイアグラム */
        .mermaid {
          text-align: center;
          margin: 1rem 0;
          background: var(--hover-color, #f1f5f9);
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .mermaid:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          background: var(--hover-color, #e2e8f0);
        }
        
        .mermaid::after {
          content: "🔍";
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          font-size: 1.25rem;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .mermaid:hover::after {
          opacity: 0.7;
        }
        
        /* 折りたたみ見出し */
        .collapsible-heading {
          position: relative;
          cursor: pointer;
          padding-left: 1.75rem;
        }
        
        .collapsible-heading:hover {
          color: var(--primary-color, #3b82f6);
        }
        
        .heading-toggle {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
          opacity: 0.7;
          transition: all 0.2s ease;
          color: var(--text-secondary, #64748b);
        }
        
        .heading-toggle:hover {
          opacity: 1;
        }
        
        .heading-toggle svg {
          width: 100%;
          height: 100%;
          transform: rotate(0deg);
          transition: transform 0.2s ease;
        }
        
        .heading-toggle.collapsed svg {
          transform: rotate(-90deg);
        }
        
        .heading-content {
          overflow: hidden;
          transition: max-height 0.3s ease;
          max-height: 5000px; /* 十分に大きな値 */
        }
        
        .heading-content.collapsed {
          max-height: 0;
        }
        
        /* コンテンツラッパー */
        .content-wrapper {
          position: relative;
        }
        
        /* highlight.js GitHub テーマの基本スタイル */
        .hljs {
          color: #24292e;
          background: #f6f8fa;
        }
        
        .hljs-comment,
        .hljs-quote {
          color: #6a737d;
        }
        
        .hljs-keyword,
        .hljs-selector-tag,
        .hljs-type {
          color: #d73a49;
        }
        
        .hljs-literal,
        .hljs-number,
        .hljs-tag .hljs-attr,
        .hljs-template-variable,
        .hljs-variable {
          color: #005cc5;
        }
        
        .hljs-string,
        .hljs-doctag,
        .hljs-regexp {
          color: #032f62;
        }
        
        .hljs-title,
        .hljs-section,
        .hljs-selector-id {
          color: #6f42c1;
          font-weight: bold;
        }
        
        .hljs-symbol,
        .hljs-bullet,
        .hljs-link,
        .hljs-meta,
        .hljs-selector-attr,
        .hljs-selector-pseudo {
          color: #e36209;
        }
        
        .hljs-built_in,
        .hljs-title.class_,
        .hljs-class .hljs-title {
          color: #6f42c1;
        }
        
        .hljs-emphasis {
          font-style: italic;
        }
        
        .hljs-strong {
          font-weight: bold;
        }
        
        .hljs-addition {
          color: #22863a;
          background-color: #f0fff4;
        }
        
        .hljs-deletion {
          color: #b31d28;
          background-color: #ffeef0;
        }
      </style>
      
      <div class="content-wrapper">
        <!-- コンテンツは動的に挿入されます -->
      </div>
    `;
    this.shadowRoot.appendChild(wrapper);
  }
  
  async setContent(markdownText) {
    try {
      // marked.jsが読み込まれているか確認
      if (typeof marked === 'undefined') {
        throw new Error('marked.js is not loaded');
      }
      
      // マークダウンをパース
      const html = await this.parseMarkdown(markdownText);
      
      // Shadow DOMではなく、通常のDOMにコンテンツを設定
      const contentWrapper = this.shadowRoot.querySelector('.content-wrapper');
      if (contentWrapper) {
        contentWrapper.innerHTML = html;
        console.log('Content set in shadow DOM wrapper');
      } else {
        console.error('Content wrapper not found');
      }
      
      // 後処理
      this.postProcess();
      
      // コンテンツ更新イベントを発火
      this.dispatchEvent(new CustomEvent('content-updated', {
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      console.error('Error rendering markdown:', error);
      const contentWrapper = this.shadowRoot.querySelector('.content-wrapper');
      if (contentWrapper) {
        contentWrapper.innerHTML = '<p>マークダウンの表示中にエラーが発生しました</p>';
      }
    }
  }
  
  async parseMarkdown(markdown) {
    // カスタムレンダラーの設定
    const renderer = new marked.Renderer();
    let headingIndex = 0;
    
    // 見出しに折りたたみ機能を追加
    renderer.heading = function(token) {
      // 新しいmarked.jsではtokenオブジェクトが渡される
      const text = token.text || '';
      const level = token.depth || 1;
      
      const id = `heading-${headingIndex++}`;
      const toggleIcon = `<span class="heading-toggle" data-target="${id}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>`;
      
      // 見出しを記録（thisはMarkdownContentインスタンスを参照）
      this.headings.push({ id, text, level });
      
      return `<h${level} id="${id}" class="collapsible-heading" data-text="${text}">${toggleIcon}${text}</h${level}>`;
    }.bind(this);
    
    // 画像にクラスを追加
    renderer.image = function(token) {
      const href = token.href || '';
      const title = token.title || '';
      const text = token.text || '';
      
      // 相対パスの場合は現在のベースURLを考慮
      const src = href.startsWith('http') ? href : new URL(href, window.location.href).href;
      
      return `<img src="${src}" alt="${text}" title="${title}" class="markdown-image" loading="lazy" />`;
    };
    
    // コードブロックの処理
    renderer.code = function(token) {
      const code = token.text || '';
      const language = token.lang || '';
      
      if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`;
      }
      
      // HTMLエスケープ処理（highlight.jsの前に必要）
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      
      // highlight.jsが利用可能な場合
      if (typeof hljs !== 'undefined' && language) {
        try {
          // highlight.js v11のAPI
          const result = hljs.highlight(code, { language });
          return `<pre><code class="hljs language-${language}">${result.value}</code></pre>`;
        } catch (e) {
          // エラー時はそのまま表示
          console.warn(`Syntax highlighting failed for language: ${language}`, e);
        }
      }
      
      return `<pre><code class="${language ? `language-${language}` : ''}">${escaped}</code></pre>`;
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
    const contentWrapper = this.shadowRoot.querySelector('.content-wrapper');
    if (!contentWrapper) {
      console.error('Content wrapper not found in postProcess');
      return;
    }
    
    // Mermaidダイアグラムの初期化
    if (typeof mermaid !== 'undefined') {
      const mermaidElements = contentWrapper.querySelectorAll('.mermaid');
      console.log('Found mermaid elements:', mermaidElements.length);
      if (mermaidElements.length > 0) {
        // 各要素にユニークなIDを付与して、内容を一時的に保存
        mermaidElements.forEach((element, index) => {
          const graphDefinition = element.textContent;
          element.textContent = '';
          element.removeAttribute('data-processed');
          
          if (!element.id) {
            element.id = `mermaid-${Date.now()}-${index}`;
          }
          
          try {
            mermaid.render(element.id + '-svg', graphDefinition).then((result) => {
              element.innerHTML = result.svg;
            });
          } catch (error) {
            console.error('Mermaid render error:', error);
            element.textContent = graphDefinition;
            element.style.color = 'red';
          }
        });
      }
    }
    
    // 折りたたみ機能の初期化
    this.initializeCollapsible();
    
    // 画像のライトボックス化
    this.initializeImageLightbox();
  }
  
  initializeCollapsible() {
    const contentWrapper = this.shadowRoot.querySelector('.content-wrapper');
    if (!contentWrapper) return;
    
    const headings = contentWrapper.querySelectorAll('.collapsible-heading');
    console.log('Found collapsible headings:', headings.length);
    
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
      if (sibling.classList && sibling.classList.contains('heading-content')) {
        sibling = sibling.nextElementSibling;
        continue;
      }
      
      if (sibling.tagName && sibling.tagName.match(/^H[1-6]$/)) {
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
    const contentWrapper = this.shadowRoot.querySelector('.content-wrapper');
    if (!contentWrapper) return;
    
    // 通常の画像
    const images = contentWrapper.querySelectorAll('.markdown-image');
    console.log('Found images:', images.length);
    images.forEach(img => {
      img.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('image-clicked', {
          detail: { src: img.src, alt: img.alt },
          bubbles: true,
          composed: true
        }));
      });
    });
    
    // Mermaidダイアグラム
    const mermaidDiagrams = contentWrapper.querySelectorAll('.mermaid');
    console.log('Setting up click handlers for Mermaid diagrams:', mermaidDiagrams.length);
    mermaidDiagrams.forEach(diagram => {
      diagram.addEventListener('click', () => {
        // SVGを画像として取得
        const svg = diagram.querySelector('svg');
        if (svg) {
          // SVGのクローンを作成してサイズを確保
          const svgClone = svg.cloneNode(true);
          
          // viewBoxがない場合は設定
          if (!svgClone.hasAttribute('viewBox')) {
            const bbox = svg.getBoundingClientRect();
            svgClone.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);
          }
          
          // width/heightを明示的に設定
          if (!svgClone.hasAttribute('width')) {
            svgClone.setAttribute('width', svg.getBoundingClientRect().width);
          }
          if (!svgClone.hasAttribute('height')) {
            svgClone.setAttribute('height', svg.getBoundingClientRect().height);
          }
          
          // スタイルを追加
          svgClone.style.background = 'white';
          svgClone.style.padding = '20px';
          
          // SVGをdata URLに変換
          const svgData = new XMLSerializer().serializeToString(svgClone);
          const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
          
          this.dispatchEvent(new CustomEvent('image-clicked', {
            detail: { 
              src: svgDataUrl, 
              alt: 'Mermaid Diagram',
              isMermaid: true 
            },
            bubbles: true,
            composed: true
          }));
        }
      });
    });
  }
  
  getHeadings() {
    return this.headings;
  }
}

/**
 * 目次ナビゲーションコンポーネント
 * マークダウンの見出しから目次を生成し、ナビゲーション機能を提供
 */
class TocNavigation extends HTMLElement {
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
    console.log('TocNavigation scrollToHeading called with id:', id);
    
    // スクロールイベントを発火（MarkdownContentコンポーネントが処理する）
    this.dispatchEvent(new CustomEvent('toc-navigate', {
      detail: { headingId: id },
      bubbles: true,
      composed: true
    }));
    
    // アクティブ状態を更新
    this.setActiveHeading(id);
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
    
    // ViewerContainerのコンテンツエリアを探してリスナーを設定
    setTimeout(() => {
      const viewerContainer = document.querySelector('viewer-container');
      if (viewerContainer && viewerContainer.shadowRoot) {
        const contentArea = viewerContainer.shadowRoot.querySelector('.content-area');
        if (contentArea) {
          contentArea.addEventListener('scroll', this.scrollHandler);
        }
      }
    }, 100);
  }
  
  removeScrollListener() {
    if (this.scrollHandler) {
      const viewerContainer = document.querySelector('viewer-container');
      if (viewerContainer && viewerContainer.shadowRoot) {
        const contentArea = viewerContainer.shadowRoot.querySelector('.content-area');
        if (contentArea) {
          contentArea.removeEventListener('scroll', this.scrollHandler);
        }
      }
    }
  }
  
  updateActiveHeading() {
    if (!this.headings || this.headings.length === 0) return;
    
    // MarkdownContentコンポーネントを探す
    const markdownContent = document.querySelector('markdown-content');
    if (!markdownContent || !markdownContent.shadowRoot) return;
    
    const contentWrapper = markdownContent.shadowRoot.querySelector('.content-wrapper');
    if (!contentWrapper) return;
    
    // ViewerContainerのコンテンツエリアを取得
    const viewerContainer = document.querySelector('viewer-container');
    if (!viewerContainer || !viewerContainer.shadowRoot) return;
    
    const scrollContainer = viewerContainer.shadowRoot.querySelector('.content-area');
    if (!scrollContainer) return;
    
    const scrollTop = scrollContainer.scrollTop;
    const containerRect = scrollContainer.getBoundingClientRect();
    let activeId = null;
    
    // 逆順で探索（下から上へ）
    for (let i = this.headings.length - 1; i >= 0; i--) {
      const heading = this.headings[i];
      const element = contentWrapper.querySelector(`#${heading.id}`);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top + scrollTop;
        
        if (relativeTop <= scrollTop + 100) {
          activeId = heading.id;
          break;
        }
      }
    }
    
    if (activeId && activeId !== this.activeId) {
      this.setActiveHeading(activeId);
    }
  }
}

/**
 * 画像ライトボックスコンポーネント
 * Web標準のdialog要素を使用した画像プレビュー
 */
class ImageLightbox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
        }
        
        dialog {
          width: 90vw;
          height: auto;
          max-height: 90vh;
          padding: 0;
          border: none;
          background: transparent;
          overflow: auto;
        }
        
        dialog::backdrop {
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(5px);
        }
        
        .lightbox-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .lightbox-image {
          width: auto;
          height: auto;
          max-width: 90vw;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          background: white;
        }
        
        .close-button {
          position: fixed;
          top: 2rem;
          right: 2rem;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          font-size: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }
        
        .close-button:hover {
          background: white;
          transform: scale(1.1);
        }
        
        @media (max-width: 768px) {
          dialog {
            width: 95vw;
          }
          
          .lightbox-image {
            max-width: 95vw;
            border-radius: 0;
          }
          
          .close-button {
            top: 1rem;
            right: 1rem;
            width: 40px;
            height: 40px;
            font-size: 28px;
          }
        }
      </style>
      
      <dialog>
        <div class="lightbox-container">
          <button class="close-button" aria-label="閉じる">×</button>
          <img class="lightbox-image" alt="">
        </div>
      </dialog>
    `;
  }
  
  setupEventListeners() {
    const dialog = this.shadowRoot.querySelector('dialog');
    const closeButton = this.shadowRoot.querySelector('.close-button');
    
    closeButton.addEventListener('click', () => this.close());
    
    // dialog要素の外側をクリックしたら閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        this.close();
      }
    });
    
    // ESCキーで閉じる（dialog要素の標準機能）
    dialog.addEventListener('cancel', () => this.close());
  }
  
  show(src, alt = '') {
    const dialog = this.shadowRoot.querySelector('dialog');
    const img = this.shadowRoot.querySelector('.lightbox-image');
    
    img.src = src;
    img.alt = alt;
    
    this.style.display = 'block';
    dialog.showModal();
  }
  
  close() {
    const dialog = this.shadowRoot.querySelector('dialog');
    dialog.close();
    this.style.display = 'none';
  }
}

// カスタム要素として登録
console.log('Registering custom elements...');
customElements.define('markdown-viewer-app', MarkdownViewerApp);
customElements.define('drop-zone-component', DropZoneComponent);
customElements.define('viewer-container', ViewerContainer);
customElements.define('markdown-content', MarkdownContent);
customElements.define('toc-navigation', TocNavigation);
customElements.define('image-lightbox', ImageLightbox);
console.log('Custom elements registered successfully');