/**
 * セッション管理モジュール
 * Web Storage APIを使用したセッション永続化
 */
export class SessionManager {
  constructor() {
    this.STORAGE_KEY = 'markdownViewerSession';
    this.MAX_CONTENT_SIZE = 1024 * 1024; // 1MB
    this.SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間
  }

  /**
   * セッションデータを保存
   * @param {Object} sessionData - 保存するセッションデータ
   */
  save(sessionData) {
    try {
      const session = {
        ...sessionData,
        timestamp: Date.now()
      };

      // サイズチェック
      const contentSize = sessionData.content?.length || 0;
      if (contentSize > this.MAX_CONTENT_SIZE) {
        console.warn('Content too large to save in localStorage');
        return false;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      return true;
    } catch (error) {
      console.error('Failed to save session:', error);
      return false;
    }
  }

  /**
   * セッションデータを読み込み
   * @returns {Object|null} セッションデータまたはnull
   */
  load() {
    try {
      const sessionData = localStorage.getItem(this.STORAGE_KEY);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);

      // 有効期限チェック
      if (Date.now() - session.timestamp > this.SESSION_DURATION) {
        this.clear();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to load session:', error);
      this.clear();
      return null;
    }
  }

  /**
   * セッションデータをクリア
   */
  clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * セッションが存在するかチェック
   * @returns {boolean}
   */
  exists() {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
}