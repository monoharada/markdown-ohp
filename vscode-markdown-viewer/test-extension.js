const vscode = require('vscode');

function activate(context) {
    console.log('Test extension is now active!');
    
    let disposable = vscode.commands.registerCommand('test.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Test Extension!');
    });
    
    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};