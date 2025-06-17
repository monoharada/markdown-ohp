# PlantUMLについて

PlantUMLをブラウザで直接レンダリングすることは技術的に困難です。理由：

1. **Java依存性**: PlantUMLはJavaベースのツールで、ブラウザでは直接実行できません
2. **セキュリティ制限**: ブラウザのセキュリティポリシーにより、外部プロセスの実行は不可能

## 代替案

### 1. PlantUML公式サーバー
```javascript
const plantUmlUrl = `https://www.plantuml.com/plantuml/svg/${encodedDiagram}`;
```

### 2. Kroki.io（推奨）
複数のダイアグラムツールをサポートするオープンソースサービス
```javascript
const krokiUrl = `https://kroki.io/plantuml/svg/${encodedDiagram}`;
```

### 3. Mermaidで代替
MermaidはJavaScriptネイティブなので、ブラウザで直接レンダリング可能です。
多くのダイアグラムタイプをサポート：
- フローチャート
- シーケンス図
- ガントチャート
- クラス図
- 状態図
- ER図
など

現在の実装では、Mermaidを使用することを推奨します。