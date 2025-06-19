import { eventBus } from './EventBus.js';

/**
 * ドラッグ＆ドロップ処理モジュール
 * HTML5 Drag and Drop APIを使用
 */
export class DragDropHandler {
  constructor(dropZone) {
    this.dropZone = dropZone;
    this.setupEventListeners();
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ドラッグオーバー
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.dropZone.classList.add('drag-over');
      eventBus.emit('dragdrop:over');
    });

    // ドラッグリーブ
    this.dropZone.addEventListener('dragleave', (e) => {
      // ドロップゾーンから完全に出た場合のみ
      if (e.target === this.dropZone) {
        this.dropZone.classList.remove('drag-over');
        eventBus.emit('dragdrop:leave');
      }
    });

    // ドロップ
    this.dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer.files);
      const markdownFiles = files.filter(file => 
        file.name.match(/\.(md|markdown)$/i)
      );

      if (markdownFiles.length > 0) {
        eventBus.emit('dragdrop:file', { 
          file: markdownFiles[0],
          allFiles: markdownFiles 
        });
      } else {
        eventBus.emit('dragdrop:invalid', { 
          message: 'Please drop a markdown file (.md or .markdown)' 
        });
      }
    });

    // ドラッグエンター（オプション）
    this.dropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      eventBus.emit('dragdrop:enter');
    });
  }

  /**
   * ドロップゾーンを有効化/無効化
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.dropZone.style.pointerEvents = enabled ? 'auto' : 'none';
    this.dropZone.style.opacity = enabled ? '1' : '0.5';
  }

  /**
   * ドロップゾーンの表示/非表示
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.dropZone.style.display = visible ? 'flex' : 'none';
  }
}