import { eventBus } from './EventBus.js';

/**
 * ファイル操作を管理するモジュール
 * File System Access APIとFile APIを統合
 */
export class FileHandler {
  constructor() {
    this.fileHandle = null;
    this.lastModified = null;
    this.currentFile = null;
    this.watchInterval = null;
  }

  /**
   * File System Access APIが利用可能かチェック
   */
  get isFileSystemAPIAvailable() {
    return 'showOpenFilePicker' in window;
  }

  /**
   * ファイルピッカーを開く
   * @returns {Promise<File|null>}
   */
  async openFilePicker() {
    if (!this.isFileSystemAPIAvailable) {
      throw new Error('File System Access API is not available');
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Markdown files',
          accept: { 'text/markdown': ['.md', '.markdown'] }
        }]
      });

      this.fileHandle = handle;
      return await this.readFromHandle();
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * FileHandleからファイルを読み込む
   * @returns {Promise<File>}
   */
  async readFromHandle() {
    if (!this.fileHandle) {
      throw new Error('No file handle available');
    }

    const file = await this.fileHandle.getFile();
    this.lastModified = file.lastModified;
    this.currentFile = file;
    return file;
  }

  /**
   * 通常のFileオブジェクトを読み込む
   * @param {File} file
   * @returns {Promise<string>}
   */
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * ファイルの変更監視を開始
   * @param {number} interval - チェック間隔（ミリ秒）
   */
  startWatching(interval = 1000) {
    if (!this.fileHandle) return;

    this.stopWatching();
    
    this.watchInterval = setInterval(async () => {
      try {
        const file = await this.fileHandle.getFile();
        if (file.lastModified !== this.lastModified) {
          this.lastModified = file.lastModified;
          this.currentFile = file;
          
          const content = await this.readFile(file);
          eventBus.emit('file:changed', {
            file,
            content,
            fileName: file.name
          });
        }
      } catch (error) {
        console.error('File watch error:', error);
        eventBus.emit('file:watch-error', { error });
      }
    }, interval);

    eventBus.emit('file:watch-started');
  }

  /**
   * ファイルの変更監視を停止
   */
  stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      eventBus.emit('file:watch-stopped');
    }
  }

  /**
   * 現在のファイルハンドルをクリア
   */
  clear() {
    this.stopWatching();
    this.fileHandle = null;
    this.lastModified = null;
    this.currentFile = null;
  }

  /**
   * ホットリロードが有効かチェック
   */
  get isHotReloadEnabled() {
    return this.fileHandle !== null && this.watchInterval !== null;
  }
}