/**
 * 通知管理モジュール
 * Web標準のNotification APIとカスタム通知の統合
 */
export class NotificationManager {
  constructor() {
    this.container = null;
    this.defaultDuration = 3000;
    this.createContainer();
  }

  /**
   * 通知コンテナを作成
   */
  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  /**
   * 通知を表示
   * @param {string} message - 通知メッセージ
   * @param {Object} options - オプション
   */
  show(message, options = {}) {
    const {
      type = 'info',
      duration = this.defaultDuration,
      persistent = false
    } = options;

    const notification = this.createNotificationElement(message, type);
    this.container.appendChild(notification);

    // アニメーション
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    if (!persistent) {
      setTimeout(() => this.remove(notification), duration);
    }

    return notification;
  }

  /**
   * 通知要素を作成
   * @param {string} message
   * @param {string} type
   * @returns {HTMLElement}
   */
  createNotificationElement(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      padding: 12px 24px;
      margin-bottom: 10px;
      background: ${this.getBackgroundColor(type)};
      color: white;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transform: translateX(400px);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: all;
      cursor: pointer;
    `;

    // クリックで削除
    notification.addEventListener('click', () => this.remove(notification));

    return notification;
  }

  /**
   * 背景色を取得
   * @param {string} type
   * @returns {string}
   */
  getBackgroundColor(type) {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    return colors[type] || colors.info;
  }

  /**
   * 通知を削除
   * @param {HTMLElement} notification
   */
  remove(notification) {
    notification.style.transform = 'translateX(400px)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }

  /**
   * すべての通知をクリア
   */
  clearAll() {
    const notifications = this.container.querySelectorAll('.notification');
    notifications.forEach(notification => this.remove(notification));
  }

  /**
   * システム通知の権限をリクエスト
   * @returns {Promise<string>}
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * システム通知を表示
   * @param {string} title
   * @param {Object} options
   */
  async showSystemNotification(title, options = {}) {
    const permission = await this.requestPermission();
    
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    } else {
      // フォールバックとして通常の通知を表示
      this.show(title, { type: 'info' });
    }
  }
}