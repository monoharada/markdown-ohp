import { eventBus } from '../modules/EventBus.js';

/**
 * ドロップゾーンのWeb Component
 */
export class DropZone extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  connectedCallback() {
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
        }
        
        .drop-zone {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 600px;
          height: 400px;
          border: 3px dashed #d1d5db;
          border-radius: 12px;
          background: #f9fafb;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .drop-zone:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        
        .drop-zone.drag-over {
          border-color: #3b82f6;
          background: #dbeafe;
          transform: scale(1.02);
        }
        
        .drop-zone-content {
          text-align: center;
          pointer-events: none;
        }
        
        .upload-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          color: #6b7280;
        }
        
        .drop-zone-text {
          font-size: 1.5rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.5rem;
        }
        
        .drop-zone-subtext {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
        }
        
        input[type="file"] {
          display: none;
        }
      </style>
      
      <div class="drop-zone">
        <div class="drop-zone-content">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          <h1 class="drop-zone-text">マークダウンファイルをドラッグ&ドロップ</h1>
          <p class="drop-zone-subtext">または クリックしてファイルを選択（ホットリロード対応）</p>
          <input type="file" accept=".md,.markdown" />
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const dropZone = this.shadowRoot.querySelector('.drop-zone');
    const fileInput = this.shadowRoot.querySelector('input[type="file"]');

    // クリックでファイル選択
    dropZone.addEventListener('click', () => {
      eventBus.emit('dropzone:click');
      fileInput.click();
    });

    // ファイル選択
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.name.match(/\.(md|markdown)$/i)) {
        eventBus.emit('file:selected', { file, source: 'input' });
      }
    });

    // ドラッグイベント
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const file = e.dataTransfer.files[0];
      if (file && file.name.match(/\.(md|markdown)$/i)) {
        eventBus.emit('file:selected', { file, source: 'drop' });
      }
    });
  }

  removeEventListeners() {
    // 必要に応じて実装
  }

  set visible(value) {
    this.style.display = value ? 'flex' : 'none';
  }

  get visible() {
    return this.style.display !== 'none';
  }
}

customElements.define('drop-zone', DropZone);