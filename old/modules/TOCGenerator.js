import { eventBus } from './EventBus.js';

/**
 * 目次生成・管理モジュール
 */
export class TOCGenerator {
  constructor() {
    this.tocElement = null;
    this.headings = [];
    this.activeHeadingId = null;
  }

  /**
   * 目次を生成
   * @param {HTMLElement} container - コンテンツコンテナ
   * @param {HTMLElement} tocElement - 目次要素
   */
  generate(container, tocElement) {
    this.tocElement = tocElement;
    this.headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    
    const tocHTML = this.buildTOCHTML();
    tocElement.innerHTML = tocHTML;
    
    this.attachEventListeners();
    eventBus.emit('toc:generated', { items: this.getTOCItems() });
  }

  /**
   * 目次のHTMLを構築
   * @returns {string}
   */
  buildTOCHTML() {
    let html = '<ul>';
    
    this.headings.forEach((heading) => {
      const level = parseInt(heading.tagName.substring(1));
      const text = heading.getAttribute('data-text') || heading.textContent;
      const id = heading.id;
      
      html += `<li class="toc-h${level}">
        <a href="#${id}" data-id="${id}">${text}</a>
      </li>`;
    });
    
    html += '</ul>';
    return html;
  }

  /**
   * 目次アイテムの配列を取得
   * @returns {Array}
   */
  getTOCItems() {
    return this.headings.map(heading => ({
      id: heading.id,
      text: heading.getAttribute('data-text') || heading.textContent,
      level: parseInt(heading.tagName.substring(1))
    }));
  }

  /**
   * イベントリスナーを設定
   */
  attachEventListeners() {
    // 目次クリックイベント
    this.tocElement.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-id');
        this.scrollToHeading(targetId);
      });
    });
  }

  /**
   * 指定した見出しにスクロール
   * @param {string} headingId
   */
  scrollToHeading(headingId) {
    const targetEl = document.getElementById(headingId);
    if (targetEl) {
      targetEl.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      this.setActiveHeading(headingId);
      eventBus.emit('toc:navigate', { headingId });
    }
  }

  /**
   * アクティブな見出しを設定
   * @param {string} headingId
   */
  setActiveHeading(headingId) {
    this.activeHeadingId = headingId;
    
    this.tocElement.querySelectorAll('a').forEach(link => {
      if (link.getAttribute('data-id') === headingId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * スクロール位置に基づいてアクティブな見出しを更新
   * @param {number} scrollTop
   */
  updateActiveHeadingByScroll(scrollTop) {
    let activeId = null;
    
    // 逆順で探索（下から上へ）
    for (let i = this.headings.length - 1; i >= 0; i--) {
      const heading = this.headings[i];
      if (heading.offsetTop <= scrollTop + 100) {
        activeId = heading.id;
        break;
      }
    }
    
    if (activeId && activeId !== this.activeHeadingId) {
      this.setActiveHeading(activeId);
    }
  }

  /**
   * 目次をクリア
   */
  clear() {
    if (this.tocElement) {
      this.tocElement.innerHTML = '';
    }
    this.headings = [];
    this.activeHeadingId = null;
  }
}