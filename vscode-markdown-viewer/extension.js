const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Markdown OHP Viewer is now active!');

    let currentPanel = undefined;
    let currentDocument = undefined;

    // コマンドの登録
    let disposable = vscode.commands.registerCommand('markdownOhp.openPreview', (uri) => {
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
        
        if (!targetUri) {
            vscode.window.showErrorMessage('マークダウンファイルを開いてください');
            return;
        }

        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (currentPanel) {
            // 既存のパネルを表示
            currentPanel.reveal(columnToShowIn);
        } else {
            // 新しいパネルを作成
            currentPanel = vscode.window.createWebviewPanel(
                'markdownOhpPreview',
                'Markdown OHP Preview',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(context.extensionPath, 'media')),
                        vscode.Uri.file(path.dirname(targetUri.fsPath))
                    ]
                }
            );

            // パネルが閉じられたときの処理
            currentPanel.onDidDispose(
                () => {
                    currentPanel = undefined;
                    currentDocument = undefined;
                },
                null,
                context.subscriptions
            );
        }

        // マークダウンファイルを読み込んで表示
        updateWebview(targetUri);

        // ファイル監視を設定
        setupFileWatcher(targetUri, context);
    });

    context.subscriptions.push(disposable);

    /**
     * WebViewを更新
     */
    function updateWebview(uri) {
        if (!currentPanel) return;

        currentDocument = uri;
        const markdownContent = fs.readFileSync(uri.fsPath, 'utf8');
        const fileName = path.basename(uri.fsPath);
        
        currentPanel.title = `Preview: ${fileName}`;
        currentPanel.webview.html = getWebviewContent(markdownContent, fileName);
    }

    /**
     * ファイル監視の設定
     */
    function setupFileWatcher(uri, context) {
        if (!currentDocument) return;

        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(
                vscode.workspace.getWorkspaceFolder(uri),
                path.relative(vscode.workspace.getWorkspaceFolder(uri).uri.fsPath, uri.fsPath)
            )
        );

        watcher.onDidChange(() => {
            if (currentPanel && currentDocument?.fsPath === uri.fsPath) {
                const config = vscode.workspace.getConfiguration('markdownOhp');
                if (config.get('autoReload')) {
                    updateWebview(uri);
                }
            }
        });

        context.subscriptions.push(watcher);
    }

    /**
     * WebViewのHTMLコンテンツを生成
     */
    function getWebviewContent(markdownContent, fileName) {
        const config = vscode.workspace.getConfiguration('markdownOhp');
        const showToc = config.get('showToc', true);

        // web-components.jsの内容を埋め込む（本番環境では別途管理）
        const webComponentsJs = getWebComponentsScript();

        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName} - Markdown OHP Viewer</title>
    
    <style>
        :root {
            --primary-color: #3b82f6;
            --secondary-color: #64748b;
            --background-color: #f8fafc;
            --surface-color: #ffffff;
            --text-color: #1e293b;
            --text-secondary: #64748b;
            --border-color: #e2e8f0;
            --hover-color: #f1f5f9;
            --code-bg: #f6f8fa;
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        
        /* VSCode specific styles */
        body.vscode-light {
            --background-color: #ffffff;
            --surface-color: #f8f8f8;
        }
        
        body.vscode-dark {
            --background-color: #1e1e1e;
            --surface-color: #252526;
            --text-color: #cccccc;
            --border-color: #464647;
            --hover-color: #2a2d2e;
        }
    </style>
    
    <!-- 外部ライブラリ -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">
    <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/highlight.min.js"></script>
</head>
<body>
    <!-- メインアプリケーション -->
    <markdown-viewer-app></markdown-viewer-app>
    
    <!-- カスタムライトボックスコンポーネント -->
    <image-lightbox></image-lightbox>
    
    <!-- Web Components -->
    <script>${webComponentsJs}</script>
    
    <!-- 初期化スクリプト -->
    <script>
        // VSCodeのテーマを検出
        const theme = document.body.classList.contains('vscode-dark') ? 'dark' : 'light';
        document.body.setAttribute('data-theme', theme);
        
        // マークダウンコンテンツを設定
        window.initialMarkdownContent = ${JSON.stringify(markdownContent)};
        window.fileName = ${JSON.stringify(fileName)};
        window.showToc = ${showToc};
        
        // ライブラリの読み込みを待つ
        async function initializeApp() {
            console.log('VSCode Extension: initializeApp called');
            
            let attempts = 0;
            while ((typeof marked === 'undefined' || typeof mermaid === 'undefined') && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (typeof marked === 'undefined' || typeof mermaid === 'undefined') {
                console.error('Required libraries failed to load');
                return;
            }
            
            // Mermaidの初期化
            mermaid.initialize({
                startOnLoad: false,
                theme: theme === 'dark' ? 'dark' : 'default'
            });
            
            // アプリケーションコンポーネントを取得して直接コンテンツを設定
            setTimeout(() => {
                const app = document.querySelector('markdown-viewer-app');
                if (app) {
                    // ビューアーモードで開始
                    app.setAttribute('mode', 'viewer');
                    
                    // コンテンツを直接設定
                    const viewer = app.shadowRoot.querySelector('viewer-container');
                    if (viewer) {
                        viewer.setContent({
                            fileName: window.fileName,
                            content: window.initialMarkdownContent,
                            lastModified: Date.now()
                        });
                        
                        // 目次の表示/非表示
                        if (!window.showToc) {
                            viewer.toggleToc();
                        }
                    }
                }
            }, 500);
        }
        
        // アプリケーションを初期化
        initializeApp();
    </script>
</body>
</html>`;
    }

    /**
     * Web Componentsのスクリプトを取得（簡略版）
     */
    function getWebComponentsScript() {
        try {
            // 実際の実装では、web-components.jsファイルを読み込む
            const webComponentsPath = path.join(context.extensionPath, '..', 'web-components.js');
            if (fs.existsSync(webComponentsPath)) {
                return fs.readFileSync(webComponentsPath, 'utf8');
            } else {
                console.error('web-components.js not found at:', webComponentsPath);
                // フォールバック: 簡略版のコンポーネントを返す
                return getSimplifiedWebComponents();
            }
        } catch (error) {
            console.error('Error loading web-components.js:', error);
            return getSimplifiedWebComponents();
        }
    }

    /**
     * 簡略版のWeb Componentsを返す（フォールバック用）
     */
    function getSimplifiedWebComponents() {
        return `
            // 簡略版のマークダウンビューアー
            class MarkdownViewerApp extends HTMLElement {
                connectedCallback() {
                    this.innerHTML = '<div style="padding: 20px;">Loading...</div>';
                }
                setAttribute(name, value) {
                    super.setAttribute(name, value);
                    if (name === 'mode' && value === 'viewer') {
                        this.innerHTML = '<viewer-container></viewer-container>';
                    }
                }
            }
            
            class ViewerContainer extends HTMLElement {
                setContent({ fileName, content }) {
                    this.innerHTML = \`
                        <div style="padding: 20px;">
                            <h1>\${fileName}</h1>
                            <div id="markdown-content">\${marked.parse(content)}</div>
                        </div>
                    \`;
                }
            }
            
            customElements.define('markdown-viewer-app', MarkdownViewerApp);
            customElements.define('viewer-container', ViewerContainer);
        `;
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};