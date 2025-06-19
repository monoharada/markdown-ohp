/**
 * マークダウンビューアーのメインアプリケーションコンポーネント
 * 全体の状態管理とコンポーネント間の調整を行う
 */
export class MarkdownViewerApp extends HTMLElement {
  constructor() {
    super();
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

// カスタム要素として登録
customElements.define('markdown-viewer-app', MarkdownViewerApp);