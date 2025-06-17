# ブラウザでの編集モード実装

File System Access APIを使用すれば、ブラウザで編集した内容を元のファイルに保存できます。

## 実装方法

```javascript
// ファイルハンドルが既にある場合（ホットリロード時に取得済み）
async function saveToFile(content) {
    if (!fileHandle) return;
    
    try {
        // 書き込み権限を要求
        const writable = await fileHandle.createWritable();
        
        // 内容を書き込む
        await writable.write(content);
        
        // ファイルを閉じる
        await writable.close();
        
        showNotification('ファイルを保存しました');
    } catch (err) {
        console.error('保存エラー:', err);
    }
}
```

## 編集モードの実装例

1. **ContentEditableを使用**
   ```javascript
   // 編集可能にする
   document.getElementById('content').contentEditable = true;
   ```

2. **マークダウンエディタを埋め込む**
   - CodeMirror
   - Monaco Editor（VSCodeのエディタ）
   - SimpleMDE

3. **リアルタイム同期**
   ```javascript
   // 編集内容を監視
   content.addEventListener('input', debounce(() => {
       const markdown = convertHtmlToMarkdown(content.innerHTML);
       saveToFile(markdown);
   }, 1000));
   ```

## セキュリティ考慮事項

- ユーザーの明示的な許可が必要
- Chrome/Edge等の対応ブラウザのみ
- ファイルアクセス権限は都度確認される

この機能を実装しますか？