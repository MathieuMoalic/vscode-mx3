import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('extension.runmumax3', () => {

		// Check for active text editor
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active text editor found.');
			return;
		}

		// Extract the file name
		const fileName = editor.document.fileName;

		// Get configuration
		const config = vscode.workspace.getConfiguration('mx3');
		const mumax3Path: string | undefined = config.get('path');
		if (!mumax3Path) {
			vscode.window.showErrorMessage('Path to mumax3 or amumax is not set. Please configure it in settings.');
			return;
		}

		// Validate mumax3Path here if necessary

		// Create a new terminal
		const terminal = vscode.window.createTerminal('Mumax3 Terminal');

		// Show the terminal
		terminal.show();

		// Send the fully-resolved command
		terminal.sendText(`${mumax3Path} ${fileName}`);
	});

	context.subscriptions.push(disposable);
}
