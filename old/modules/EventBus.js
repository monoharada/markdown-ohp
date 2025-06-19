/**
 * イベント駆動アーキテクチャのための中央イベントバス
 * モジュール間の疎結合な通信を実現
 */
export class EventBus extends EventTarget {
  constructor() {
    super();
  }

  /**
   * カスタムイベントを発火
   * @param {string} eventName - イベント名
   * @param {any} detail - イベントデータ
   */
  emit(eventName, detail = null) {
    this.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  /**
   * イベントリスナーを登録
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - addEventListener のオプション
   */
  on(eventName, handler, options = {}) {
    this.addEventListener(eventName, handler, options);
  }

  /**
   * イベントリスナーを削除
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー関数
   */
  off(eventName, handler) {
    this.removeEventListener(eventName, handler);
  }

  /**
   * 一度だけ実行されるイベントリスナーを登録
   * @param {string} eventName - イベント名
   * @param {Function} handler - ハンドラー関数
   */
  once(eventName, handler) {
    this.addEventListener(eventName, handler, { once: true });
  }
}

// シングルトンインスタンスをエクスポート
export const eventBus = new EventBus();