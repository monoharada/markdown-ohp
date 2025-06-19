import { eventBus } from './modules/EventBus.js';
import { FileHandler } from './modules/FileHandler.js';
import { MarkdownRenderer } from './modules/MarkdownRenderer.js';
import { SessionManager } from './modules/SessionManager.js';
import { NotificationManager } from './modules/NotificationManager.js';
import { DragDropHandler } from './modules/DragDropHandler.js';
import { TOCGenerator } from './modules/TOCGenerator.js';

// Web Components
import './components/drop-zone.js';
import './components/markdown-viewer.js';

/**
 * アプリケーションのメインクラス
 * 各モジュールを統合して管理
 */
class MarkdownViewerApp {
  constructor() {
    console.log('MarkdownViewerApp constructor started');
    try {
      this.fileHandler = new FileHandler();
      console.log('FileHandler created');
      
      this.renderer = new MarkdownRenderer();
      console.log('MarkdownRenderer created');
      
      this.sessionManager = new SessionManager();
      console.log('SessionManager created');
      
      this.notificationManager = new NotificationManager();
      console.log('NotificationManager created');
      
      this.tocGenerator = new TOCGenerator();
      console.log('TOCGenerator created');
      
      this.dropZone = null;
      this.viewer = null;
      this.currentContent = '';
      this.currentFileName = '';
      
      this.init();
    } catch (error) {
      console.error('Error in MarkdownViewerApp constructor:', error);
      throw error;
    }
  }

  /**
   * アプリケーションの初期化
   */
  async init() {
    await this.setupDOM();
    this.setupEventListeners();
    this.initializeMermaid();
    
    // セッション復元を試みる
    await this.restoreSession();
  }

  /**
   * DOM要素の設定
   */
  async setupDOM() {
    // 通常のDOM要素を取得
    this.dropZone = document.getElementById('drop-zone');
    this.viewer = document.getElementById('viewer');
    this.fileInput = document.getElementById('file-input');
    
    if (!this.dropZone || !this.viewer) {
      console.error('Required DOM elements not found');
      return;
    }
    
    // ドラッグ&ドロップの設定
    this.setupDragAndDrop();
    
    // ファイル入力の設定
    this.setupFileInput();
  }

  /**
   * ドラッグ&ドロップの設定
   */
  setupDragAndDrop() {
    // ドラッグオーバー
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    
    // ドラッグリーブ
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('drag-over');
    });
    
    // ドロップ
    this.dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      
      const file = e.dataTransfer.files[0];
      if (file && file.name.match(/\.(md|markdown)$/i)) {
        await this.handleFileSelected(file, 'drop');
      }
    });
    
    // クリックでファイル選択
    this.dropZone.addEventListener('click', async () => {
      if (this.fileHandler.isFileSystemAPIAvailable) {
        try {
          const file = await this.fileHandler.openFilePicker();
          if (file) {
            await this.handleFileSystemAPI(file);
          }
        } catch (error) {
          console.error('File picker error:', error);
          // フォールバック：通常のファイル入力を使用
          this.fileInput.click();
        }
      } else {
        this.fileInput.click();
      }
    });
  }
  
  /**
   * ファイル入力の設定
   */
  setupFileInput() {
    this.fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file && file.name.match(/\.(md|markdown)$/i)) {
        await this.handleFileSelected(file, 'input');
      }
    });
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ファイル変更イベント
    eventBus.on('file:changed', async (e) => {
      const { content, fileName } = e.detail;
      await this.updateContent(content, fileName);
      this.notificationManager.show('ファイルが更新されました', { type: 'success' });
    });

    // その他のUIイベント
    this.setupUIEventListeners();
  }

  /**
   * UIイベントリスナーの設定
   */
  setupUIEventListeners() {
    // 目次トグル
    document.getElementById('toggle-toc')?.addEventListener('click', () => {
      const sidebar = document.getElementById('toc-sidebar');
      sidebar?.classList.toggle('hidden');
    });

    // 新規ファイル
    document.getElementById('new-file')?.addEventListener('click', () => {
      this.resetApp();
    });

    // PDFエクスポート
    document.getElementById('export-pdf')?.addEventListener('click', () => {
      this.exportToPDF();
    });

    // ホットリロードトグル
    document.getElementById('hot-reload-toggle')?.addEventListener('click', () => {
      this.toggleHotReload();
    });
  }

  /**
   * ファイル選択処理
   */
  async handleFileSelected(file, source) {
    const content = await this.fileHandler.readFile(file);
    this.currentFileName = file.name;
    
    await this.updateContent(content, file.name);
    this.showViewer();
    
    // ドロップされたファイルの場合、File System API の使用を提案
    if (source === 'drop' && this.fileHandler.isFileSystemAPIAvailable) {
      this.showHotReloadPrompt(file);
    }
    
    this.saveSession();
  }

  /**
   * File System API を使用したファイル処理
   */
  async handleFileSystemAPI(file) {
    const content = await this.fileHandler.readFile(file);
    this.currentFileName = file.name;
    
    await this.updateContent(content, file.name);
    this.showViewer();
    
    // ホットリロードを開始
    this.fileHandler.startWatching();
    this.updateHotReloadButton(true);
    
    this.notificationManager.show('ホットリロードが有効になりました', { type: 'success' });
    this.saveSession();
  }

  /**
   * コンテンツの更新
   */
  async updateContent(content, fileName) {
    this.currentContent = content;
    this.currentFileName = fileName;
    
    // レンダリング
    const html = this.renderer.render(content);
    const contentElement = document.getElementById('content');
    if (contentElement) {
      contentElement.innerHTML = html;
      
      // Mermaidの再初期化
      if (typeof mermaid !== 'undefined') {
        mermaid.init(undefined, contentElement.querySelectorAll('.mermaid'));
      }
      
      // 目次の生成
      const tocElement = document.getElementById('toc');
      if (tocElement) {
        this.tocGenerator.generate(contentElement, tocElement);
      }
      
      // 各種機能の初期化
      this.initializeFeatures();
    }
    
    // ファイル名の更新
    eventBus.emit('file:loaded', { fileName });
  }

  /**
   * 各種機能の初期化
   */
  initializeFeatures() {
    this.initializeCollapsible();
    this.initializeImageLightbox();
    this.initializeMermaidLightbox();
    this.initializeTOCHighlight();
  }

  /**
   * Mermaidの初期化
   */
  initializeMermaid() {
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#fff',
          primaryBorderColor: '#2563eb',
          lineColor: '#64748b',
          secondaryColor: '#64748b',
          tertiaryColor: '#f1f5f9'
        }
      });
    }
  }

  /**
   * 折りたたみ機能の初期化
   */
  initializeCollapsible() {
    const headings = document.querySelectorAll('.collapsible-heading');
    
    headings.forEach((heading) => {
      const toggle = heading.querySelector('.heading-toggle');
      if (!toggle) return;
      
      // 見出しの次の要素を取得してラップ
      const content = this.getHeadingContent(heading);
      if (content.length > 0) {
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

  /**
   * 見出しに属するコンテンツを取得
   */
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

  /**
   * 画像ライトボックスの初期化
   */
  initializeImageLightbox() {
    const images = document.querySelectorAll('.markdown-image');
    const dialog = document.getElementById('image-dialog');
    const dialogImg = document.getElementById('dialog-image');
    
    images.forEach(img => {
      img.addEventListener('click', () => {
        if (dialog && dialogImg) {
          dialogImg.src = img.src;
          dialogImg.alt = img.alt;
          dialog.showModal();
        }
      });
    });
  }

  /**
   * Mermaidライトボックスの初期化
   */
  initializeMermaidLightbox() {
    const mermaidDiagrams = document.querySelectorAll('.mermaid');
    const dialog = document.getElementById('mermaid-dialog');
    const dialogContent = document.getElementById('dialog-mermaid-content');
    
    mermaidDiagrams.forEach(diagram => {
      diagram.addEventListener('click', () => {
        const svg = diagram.querySelector('svg');
        if (svg && dialog && dialogContent) {
          const clonedSvg = svg.cloneNode(true);
          clonedSvg.removeAttribute('width');
          clonedSvg.removeAttribute('height');
          clonedSvg.style.cssText = 'width: 100%; height: 100%; max-width: 100%; max-height: 100%;';
          
          dialogContent.innerHTML = '';
          dialogContent.appendChild(clonedSvg);
          dialog.showModal();
        }
      });
    });
  }

  /**
   * 目次のハイライト初期化
   */
  initializeTOCHighlight() {
    const contentEl = document.getElementById('content');
    if (!contentEl) return;
    
    let ticking = false;
    
    const updateTOCHighlight = () => {
      const scrollTop = contentEl.scrollTop;
      this.tocGenerator.updateActiveHeadingByScroll(scrollTop);
      ticking = false;
    };
    
    contentEl.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateTOCHighlight);
        ticking = true;
      }
    });
  }

  /**
   * ビューアーを表示
   */
  showViewer() {
    this.dropZone.style.display = 'none';
    this.viewer.style.display = 'flex';
  }

  /**
   * ビューアーを非表示
   */
  hideViewer() {
    this.dropZone.style.display = 'flex';
    this.viewer.style.display = 'none';
  }

  /**
   * ホットリロードの切り替え
   */
  async toggleHotReload() {
    if (this.fileHandler.isHotReloadEnabled) {
      this.fileHandler.stopWatching();
      this.updateHotReloadButton(false);
      this.notificationManager.show('ホットリロードが無効になりました', { type: 'info' });
    } else {
      // ファイルピッカーを開いて再選択
      try {
        const file = await this.fileHandler.openFilePicker();
        if (file) {
          await this.handleFileSystemAPI(file);
        }
      } catch (error) {
        console.error('Hot reload enable error:', error);
      }
    }
  }

  /**
   * ホットリロードボタンの更新
   */
  updateHotReloadButton(enabled) {
    const button = document.getElementById('hot-reload-toggle');
    if (button) {
      button.classList.toggle('active', enabled);
      button.title = enabled ? 'ホットリロードを無効化' : 'ホットリロードを有効化';
    }
  }

  /**
   * ホットリロードの案内表示
   */
  showHotReloadPrompt(file) {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'hot-reload-prompt';
    promptDiv.innerHTML = `
      <div class="prompt-content">
        <p><strong>${file.name}</strong> をホットリロード対応で開きますか？</p>
        <p class="prompt-subtitle">ファイルピッカーから同じファイルを選択してください</p>
        <div class="prompt-actions">
          <button class="btn-secondary" id="open-readonly">読み取り専用で開く</button>
          <button class="btn-primary" id="open-with-hot-reload">ホットリロード対応で開く</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(promptDiv);
    
    document.getElementById('open-with-hot-reload').addEventListener('click', async () => {
      promptDiv.remove();
      try {
        const pickedFile = await this.fileHandler.openFilePicker();
        if (pickedFile) {
          await this.handleFileSystemAPI(pickedFile);
        }
      } catch (error) {
        console.error('File picker error:', error);
      }
    });
    
    document.getElementById('open-readonly').addEventListener('click', () => {
      promptDiv.remove();
    });
    
    // 自動で閉じる
    setTimeout(() => promptDiv.remove(), 6000);
  }

  /**
   * セッションの保存
   */
  saveSession() {
    this.sessionManager.save({
      fileName: this.currentFileName,
      content: this.currentContent,
      lastModified: this.fileHandler.lastModified,
      hadHotReload: this.fileHandler.isHotReloadEnabled
    });
  }

  /**
   * セッションの復元
   */
  async restoreSession() {
    const session = this.sessionManager.load();
    if (!session) return;
    
    this.currentContent = session.content;
    this.currentFileName = session.fileName;
    
    await this.updateContent(session.content, session.fileName);
    this.showViewer();
    
    if (session.hadHotReload && this.fileHandler.isFileSystemAPIAvailable) {
      this.showSessionHotReloadPrompt();
    }
    
    this.notificationManager.show('前回のセッションを復元しました', { type: 'success' });
  }

  /**
   * セッション復元時のホットリロード案内
   */
  showSessionHotReloadPrompt() {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'hot-reload-prompt';
    promptDiv.innerHTML = `
      <div class="prompt-content">
        <p>前回はホットリロードが有効でした。再度有効にしますか？</p>
        <p class="prompt-subtitle">${this.currentFileName}</p>
        <div class="prompt-actions">
          <button class="btn-secondary" id="skip-hot-reload">スキップ</button>
          <button class="btn-primary" id="enable-hot-reload">ホットリロードを有効化</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(promptDiv);
    
    document.getElementById('enable-hot-reload').addEventListener('click', async () => {
      promptDiv.remove();
      try {
        const file = await this.fileHandler.openFilePicker();
        if (file) {
          await this.handleFileSystemAPI(file);
        }
      } catch (error) {
        console.error('Hot reload enable error:', error);
      }
    });
    
    document.getElementById('skip-hot-reload').addEventListener('click', () => {
      promptDiv.remove();
      this.updateHotReloadButton(false);
    });
    
    setTimeout(() => promptDiv.remove(), 5000);
  }

  /**
   * PDFエクスポート
   */
  exportToPDF() {
    // 印刷前の準備
    const collapsedContents = document.querySelectorAll('.heading-content.collapsed');
    const collapsedToggles = document.querySelectorAll('.heading-toggle.collapsed');
    
    // 一時的に展開
    collapsedContents.forEach(content => {
      content.classList.add('print-expanded');
      content.classList.remove('collapsed');
    });
    
    collapsedToggles.forEach(toggle => {
      toggle.classList.add('print-expanded');
      toggle.classList.remove('collapsed');
    });
    
    // 印刷ダイアログ
    window.print();
    
    // 復元
    setTimeout(() => {
      document.querySelectorAll('.print-expanded').forEach(element => {
        element.classList.add('collapsed');
        element.classList.remove('print-expanded');
      });
    }, 1000);
  }

  /**
   * アプリケーションのリセット
   */
  resetApp() {
    this.fileHandler.clear();
    this.sessionManager.clear();
    this.currentContent = '';
    this.currentFileName = '';
    this.hideViewer();
    
    // ファイル入力をリセット
    const fileInput = this.dropZone.shadowRoot.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  }
}

console.log('app.js loaded');

// 外部ライブラリの読み込みを待つ
function waitForLibraries() {
  if (typeof marked !== 'undefined' && typeof mermaid !== 'undefined') {
    console.log('Libraries loaded, creating MarkdownViewerApp...');
    try {
      new MarkdownViewerApp();
      console.log('MarkdownViewerApp created successfully');
    } catch (error) {
      console.error('Error creating MarkdownViewerApp:', error);
    }
  } else {
    console.log('Waiting for libraries...', {
      marked: typeof marked,
      mermaid: typeof mermaid
    });
    setTimeout(waitForLibraries, 100);
  }
}

// DOMContentLoadedを待つ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForLibraries);
} else {
  waitForLibraries();
}