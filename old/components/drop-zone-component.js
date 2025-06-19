/**
 * ドラッグ&ドロップゾーンコンポーネント
 * ファイルの選択とドラッグ&ドロップ機能を提供
 */
export class DropZoneComponent extends HTMLElement {
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

// カスタム要素として登録
customElements.define('drop-zone-component', DropZoneComponent);