// グローバル変数
let currentMarkdown = '';
let tocItems = [];
let fileHandle = null; // File System Access APIのハンドル
let lastModified = null; // ファイルの最終更新時刻

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeDropZone();
    initializeLightbox();
    initializeButtons();
    
    // Mermaidの初期化
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
});

// ドラッグ&ドロップの初期化
function initializeDropZone() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    // クリックでファイル選択
    dropZone.addEventListener('click', async () => {
        // File System Access APIが利用可能な場合は、それを使用
        if ('showOpenFilePicker' in window) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Markdown files',
                        accept: { 'text/markdown': ['.md', '.markdown'] }
                    }]
                });
                
                fileHandle = handle;
                await readFile();
                
                // 自動的にホットリロードを開始
                startWatching();
                createHotReloadButton(true);
                showNotification('ホットリロードが有効になりました');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('ファイル選択エラー:', err);
                }
            }
        } else {
            // フォールバック: 通常のファイル選択
            fileInput.click();
        }
    });
    
    // 通常のファイル選択（フォールバック用）
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.name.match(/\.(md|markdown)$/i)) {
            readFile(file);
        }
    });
    
    // ドラッグオーバー
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    // ドラッグリーブ
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    // ドロップ
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file && file.name.match(/\.(md|markdown)$/i)) {
            // ドロップ時もFile System Access APIを使用する案内を表示
            if ('showOpenFilePicker' in window) {
                currentFileName = file.name;
                showDropFilePrompt(file);
            } else {
                readFile(file);
            }
        }
    });
}

// 現在のファイル名を保存
let currentFileName = '';

// ファイル読み込み
async function readFile(file) {
    // File System Access APIがサポートされているかチェック
    if ('showOpenFilePicker' in window && file instanceof File && !fileHandle) {
        // ドラッグ&ドロップされたファイルの場合
        const reader = new FileReader();
        reader.onload = async (e) => {
            currentMarkdown = e.target.result;
            currentFileName = file.name;
            document.getElementById('file-name').textContent = file.name;
            renderMarkdown(currentMarkdown);
            showViewer();
            
            // File System Access APIのボタンを表示（ホットリロード機能の案内）
            if ('showOpenFilePicker' in window) {
                createHotReloadButton(false);
            }
        };
        reader.readAsText(file);
    } else if (fileHandle) {
        // File System Access APIを使用した読み込み
        try {
            const file = await fileHandle.getFile();
            const text = await file.text();
            currentMarkdown = text;
            lastModified = file.lastModified;
            document.getElementById('file-name').textContent = file.name;
            renderMarkdown(currentMarkdown);
            showViewer();
        } catch (err) {
            console.error('ファイルの読み込みに失敗しました:', err);
        }
    } else {
        // 通常のFileReader APIを使用
        const reader = new FileReader();
        reader.onload = (e) => {
            currentMarkdown = e.target.result;
            document.getElementById('file-name').textContent = file.name;
            renderMarkdown(currentMarkdown);
            showViewer();
        };
        reader.readAsText(file);
    }
}

// ホットリロードボタンの作成
function createHotReloadButton(isEnabled = false) {
    const headerActions = document.querySelector('.header-actions');
    const existingBtn = document.getElementById('hot-reload-toggle');
    
    if (existingBtn) {
        existingBtn.remove();
    }
    
    const hotReloadBtn = document.createElement('button');
    hotReloadBtn.id = 'hot-reload-toggle';
    hotReloadBtn.className = 'btn btn-icon' + (isEnabled ? ' active' : '');
    hotReloadBtn.title = isEnabled ? 'ホットリロードを無効化' : 'ホットリロードを有効化';
    hotReloadBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
    `;
    
    hotReloadBtn.addEventListener('click', toggleHotReload);
    headerActions.insertBefore(hotReloadBtn, headerActions.firstChild);
    
    return hotReloadBtn;
}

// ドロップファイルの案内を表示
function showDropFilePrompt(droppedFile) {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'hot-reload-prompt';
    promptDiv.innerHTML = `
        <div class="prompt-content">
            <p><strong>${droppedFile.name}</strong> をホットリロード対応で開きますか？</p>
            <p class="prompt-subtitle">ファイルピッカーから同じファイルを選択してください</p>
            <div class="prompt-actions">
                <button class="btn-secondary" id="open-readonly">読み取り専用で開く</button>
                <button class="btn-primary" id="open-with-hot-reload">ホットリロード対応で開く</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(promptDiv);
    
    // ボタンのイベントリスナー
    document.getElementById('open-with-hot-reload').addEventListener('click', async () => {
        promptDiv.remove();
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Markdown files',
                    accept: { 'text/markdown': ['.md', '.markdown'] }
                }],
                suggestedName: droppedFile.name
            });
            
            fileHandle = handle;
            await readFile();
            
            // ホットリロードを開始
            startWatching();
            createHotReloadButton(true);
            showNotification('ホットリロードが有効になりました');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('ファイル選択エラー:', err);
                // エラー時は通常の読み込みにフォールバック
                readFile(droppedFile);
            }
        }
    });
    
    document.getElementById('open-readonly').addEventListener('click', () => {
        promptDiv.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => {
            promptDiv.remove();
            readFile(droppedFile);
        }, 300);
    });
    
    // 6秒後に自動的に読み取り専用で開く
    const autoOpenTimeout = setTimeout(() => {
        if (promptDiv.parentNode) {
            promptDiv.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => {
                promptDiv.remove();
                readFile(droppedFile);
            }, 300);
        }
    }, 6000);
    
    // ボタンクリック時はタイムアウトをクリア
    const originalClickHandlers = {
        hotReload: document.getElementById('open-with-hot-reload').onclick,
        readOnly: document.getElementById('open-readonly').onclick
    };
    
    document.getElementById('open-with-hot-reload').onclick = function() {
        clearTimeout(autoOpenTimeout);
        originalClickHandlers.hotReload?.call(this);
    };
    
    document.getElementById('open-readonly').onclick = function() {
        clearTimeout(autoOpenTimeout);
        originalClickHandlers.readOnly?.call(this);
    };
}

// 現在のファイルに対してホットリロードを有効化
async function enableHotReloadForCurrentFile() {
    try {
        // ファイルピッカーを開く（現在のファイル名をヒントとして表示）
        const opts = {
            types: [{
                description: 'Markdown files',
                accept: { 'text/markdown': ['.md', '.markdown'] }
            }],
            suggestedName: currentFileName
        };
        
        [fileHandle] = await window.showOpenFilePicker(opts);
        
        // ファイルを読み込む
        await readFile();
        
        // 監視を開始
        startWatching();
        
        // ボタンの状態を更新
        createHotReloadButton(true);
        
        // 通知を表示
        showNotification('ホットリロードが有効になりました');
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('ファイルアクセスエラー:', err);
        }
    }
}

// ホットリロードの切り替え
async function toggleHotReload() {
    if (fileHandle) {
        // 無効化
        disableHotReload();
    } else {
        // 有効化
        await enableHotReloadManual();
    }
}

// 手動でホットリロードを有効化
async function enableHotReloadManual() {
    try {
        // ファイルピッカーを開く
        [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'Markdown files',
                accept: { 'text/markdown': ['.md', '.markdown'] }
            }]
        });
        
        // ファイルを読み込む
        await readFile();
        
        // 監視を開始
        startWatching();
        
        // ボタンの状態を更新
        createHotReloadButton(true);
        
        // 通知を表示
        showNotification('ホットリロードが有効になりました');
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('ファイルアクセスエラー:', err);
            showNotification('ファイルアクセスに失敗しました', 'error');
        }
    }
}

// ホットリロードを無効化
function disableHotReload() {
    fileHandle = null;
    lastModified = null;
    
    // 監視を停止
    stopWatching();
    
    // ボタンの状態を更新
    createHotReloadButton(false);
    
    // 通知を表示
    showNotification('ホットリロードが無効になりました');
}

// ファイル監視のインターバルID
let watchInterval = null;

// ファイル監視を開始
function startWatching() {
    // 既存の監視を停止
    if (watchInterval) {
        clearInterval(watchInterval);
    }
    
    // 1秒ごとにファイルの変更をチェック
    watchInterval = setInterval(async () => {
        if (fileHandle) {
            try {
                const file = await fileHandle.getFile();
                if (file.lastModified !== lastModified) {
                    await readFile();
                    showNotification('ファイルが更新されました');
                }
            } catch (err) {
                console.error('ファイル監視エラー:', err);
            }
        }
    }, 1000);
}

// ファイル監視を停止
function stopWatching() {
    if (watchInterval) {
        clearInterval(watchInterval);
        watchInterval = null;
    }
}

// 通知を表示
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// マークダウンのレンダリング
function renderMarkdown(markdown) {
    const contentEl = document.getElementById('content');
    
    // 見出しのインデックスをリセット
    let headingIndex = 0;
    
    // marked.jsの設定
    marked.setOptions({
        highlight: function(code, lang) {
            if (typeof hljs !== 'undefined') {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (e) {
                        // エラー時は何もしない
                    }
                }
                try {
                    return hljs.highlightAuto(code).value;
                } catch (e) {
                    // エラー時は何もしない
                }
            }
            return code;
        },
        breaks: true,
        gfm: true
    });
    
    // カスタムレンダラー
    const renderer = new marked.Renderer();
    
    // 見出しにIDを付与（新しいAPI形式）
    renderer.heading = function(token) {
        // トークンから情報を取得
        const headingText = token.text || '';
        const headingLevel = token.depth || 1;
        
        const id = `heading-${headingIndex++}`;
        const toggleIcon = `<span class="heading-toggle" data-target="${id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </span>`;
        return `<h${headingLevel} id="${id}" class="collapsible-heading" data-text="${headingText}">${toggleIcon}${headingText}</h${headingLevel}>`;
    };
    
    // 画像にクラスを追加（新しいAPI形式）
    renderer.image = function(token) {
        // トークンから情報を取得
        const src = token.href || '';
        const alt = token.text || '';
        const titleAttr = token.title || '';
        
        return `<img src="${src}" alt="${alt}" title="${titleAttr}" class="markdown-image" />`;
    };
    
    // コードブロックのMermaid対応（新しいAPI形式）
    renderer.code = function(token) {
        // トークンから情報を取得
        const code = token.text || '';
        const language = token.lang || '';
        
        if (language === 'mermaid') {
            return `<div class="mermaid">${code}</div>`;
        }
        // highlight.jsが利用可能な場合のみ使用
        if (typeof hljs !== 'undefined') {
            if (language && hljs.getLanguage(language)) {
                try {
                    const highlighted = hljs.highlight(code, { language }).value;
                    return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
                } catch (e) {
                    // エラーが発生した場合は通常のコードブロックとして処理
                }
            }
            try {
                return `<pre><code class="hljs">${hljs.highlightAuto(code).value}</code></pre>`;
            } catch (e) {
                // エラーが発生した場合は通常のコードブロックとして処理
            }
        }
        // highlight.jsが利用できない場合
        const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre><code class="language-${language || ''}">${escapedCode}</code></pre>`;
    };
    
    // レンダリング
    const html = marked.parse(markdown, { renderer });
    contentEl.innerHTML = html;
    
    // Mermaidダイアグラムの再レンダリング
    setTimeout(() => {
        mermaid.init(undefined, document.querySelectorAll('.mermaid'));
    }, 100);
    
    // 目次の生成
    generateTOC();
    
    // 折りたたみ機能の初期化
    initializeCollapsible();
    
    // 画像のライトボックス化
    initializeImageLightbox();
    
    // Mermaidダイアグラムのライトボックス化
    initializeMermaidLightbox();
}

// 目次の生成
function generateTOC() {
    const tocEl = document.getElementById('toc');
    const headings = document.querySelectorAll('.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4, .markdown-content h5, .markdown-content h6');
    
    tocItems = [];
    let tocHTML = '<ul>';
    
    headings.forEach((heading) => {
        const level = parseInt(heading.tagName.substring(1));
        // data-text属性から純粋なテキストを取得
        const text = heading.getAttribute('data-text') || heading.textContent.replace(/^[\s\S]*?(?=[^\s])/, '');
        const id = heading.id;
        
        tocItems.push({ id, text, level });
        tocHTML += `<li class="toc-h${level}"><a href="#${id}" data-id="${id}">${text}</a></li>`;
    });
    
    tocHTML += '</ul>';
    tocEl.innerHTML = tocHTML;
    
    // 目次クリックイベント
    tocEl.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-id');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // アクティブ状態の更新
                tocEl.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
    
    // スクロール時のアクティブ状態更新
    initializeTOCHighlight();
}

// 目次のハイライト
function initializeTOCHighlight() {
    const contentEl = document.getElementById('content');
    let ticking = false;
    
    function updateTOCHighlight() {
        const scrollTop = contentEl.scrollTop;
        const headings = document.querySelectorAll('.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4, .markdown-content h5, .markdown-content h6');
        
        let activeId = null;
        
        for (let i = headings.length - 1; i >= 0; i--) {
            const heading = headings[i];
            if (heading.offsetTop <= scrollTop + 100) {
                activeId = heading.id;
                break;
            }
        }
        
        if (activeId) {
            const tocLinks = document.querySelectorAll('.toc a');
            tocLinks.forEach(link => {
                if (link.getAttribute('data-id') === activeId) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
        
        ticking = false;
    }
    
    contentEl.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateTOCHighlight);
            ticking = true;
        }
    });
}

// 折りたたみ機能の初期化
function initializeCollapsible() {
    const headings = document.querySelectorAll('.collapsible-heading');
    
    headings.forEach((heading) => {
        const toggle = heading.querySelector('.heading-toggle');
        if (!toggle) return;
        
        // 見出しの次の要素を取得してラップ
        const content = getHeadingContent(heading);
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

// 見出しに属するコンテンツを取得
function getHeadingContent(heading) {
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

// 画像のダイアログ表示
function initializeImageLightbox() {
    const images = document.querySelectorAll('.markdown-image');
    const dialog = document.getElementById('image-dialog');
    const dialogImg = document.getElementById('dialog-image');
    
    images.forEach(img => {
        img.addEventListener('click', () => {
            dialogImg.src = img.src;
            dialogImg.alt = img.alt;
            dialog.showModal();
        });
    });
}

// Mermaidダイアグラムのダイアログ表示
function initializeMermaidLightbox() {
    const mermaidDiagrams = document.querySelectorAll('.mermaid');
    const dialog = document.getElementById('mermaid-dialog');
    const dialogContent = document.getElementById('dialog-mermaid-content');
    
    mermaidDiagrams.forEach(diagram => {
        diagram.addEventListener('click', () => {
            // SVGを直接クローン
            const svg = diagram.querySelector('svg');
            if (svg) {
                const clonedSvg = svg.cloneNode(true);
                // width/height属性を削除
                clonedSvg.removeAttribute('width');
                clonedSvg.removeAttribute('height');
                // スタイルをリセット
                clonedSvg.style.width = '100%';
                clonedSvg.style.height = '100%';
                clonedSvg.style.maxWidth = '100%';
                clonedSvg.style.maxHeight = '100%';
                
                dialogContent.innerHTML = '';
                dialogContent.appendChild(clonedSvg);
            }
            dialog.showModal();
        });
    });
}

// ダイアログの初期化
function initializeLightbox() {
    // ESCキーでの閉じる動作は、dialog要素のデフォルト動作で対応
    // 追加の初期化は不要
}

// ボタンの初期化
function initializeButtons() {
    // 目次の表示/非表示
    document.getElementById('toggle-toc').addEventListener('click', () => {
        const sidebar = document.getElementById('toc-sidebar');
        sidebar.classList.toggle('hidden');
    });
    
    // 新しいファイルを開く
    document.getElementById('new-file').addEventListener('click', () => {
        hideViewer();
        document.getElementById('file-input').value = '';
    });
    
    // PDFエクスポート
    document.getElementById('export-pdf').addEventListener('click', () => {
        exportToPDF();
    });
}

// ビューワーを表示
function showViewer() {
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('viewer').style.display = 'flex';
}

// ビューワーを非表示
function hideViewer() {
    document.getElementById('drop-zone').style.display = 'flex';
    document.getElementById('viewer').style.display = 'none';
    
    // ホットリロード関連のリセット
    fileHandle = null;
    lastModified = null;
    
    // 監視を停止
    stopWatching();
    
    // ホットリロードボタンを削除
    const hotReloadBtn = document.getElementById('hot-reload-toggle');
    if (hotReloadBtn) {
        hotReloadBtn.remove();
    }
}

// PDFエクスポート
function exportToPDF() {
    // 印刷前の準備
    preparePrintContent();
    
    // 印刷ダイアログを開く
    window.print();
    
    // 印刷後の復元
    setTimeout(() => {
        restoreAfterPrint();
    }, 1000);
}

// 印刷用コンテンツの準備
function preparePrintContent() {
    // すべての折りたたまれたコンテンツを展開
    const collapsedContents = document.querySelectorAll('.heading-content.collapsed');
    collapsedContents.forEach(content => {
        content.classList.add('print-expanded');
        content.classList.remove('collapsed');
    });
    
    // 折りたたみアイコンの状態も更新
    const collapsedToggles = document.querySelectorAll('.heading-toggle.collapsed');
    collapsedToggles.forEach(toggle => {
        toggle.classList.add('print-expanded');
        toggle.classList.remove('collapsed');
    });
}

// 印刷後の復元
function restoreAfterPrint() {
    // 印刷用に展開したコンテンツを元に戻す
    const printExpanded = document.querySelectorAll('.print-expanded');
    printExpanded.forEach(element => {
        element.classList.add('collapsed');
        element.classList.remove('print-expanded');
    });
}