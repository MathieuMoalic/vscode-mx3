import * as vscode from 'vscode';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
let childProcess: ChildProcessWithoutNullStreams;

let isRunning = false;
let webviewPanel: vscode.WebviewPanel | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel("Simulation Output");
	context.subscriptions.push(outputChannel);

	let runDisposable = vscode.commands.registerCommand('extension.runSimulation', () => {
		if (isRunning) {
			vscode.window.showInformationMessage('The command is already running.');
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active text editor found.');
			return;
		}

		const fileName = editor.document.fileName;
		const config = vscode.workspace.getConfiguration('mx3');
		const binaryPath: string | undefined = config.get('path');
		const shouldOpenWebUI = config.get<boolean>('openWebUI', true);
		const shouldCLearOutput = config.get<boolean>('clearOutput', true);


		if (!binaryPath) {
			vscode.window.showErrorMessage(
				'Path to mumax3 or amumax is not set. Please configure it in settings.',
				'Open Settings'
			).then(selected => {
				if (selected === 'Open Settings') {
					vscode.commands.executeCommand('workbench.action.openSettings', 'mx3.path');
				}
			});
			return;
		}


		if (shouldCLearOutput) {
			outputChannel.clear();
		}
		outputChannel.show(true);

		childProcess = spawn(binaryPath, [fileName], {
			shell: true
		});
		childProcess.stdout.on('data', (data: Buffer) => {
			outputChannel.append(data.toString());
		});

		childProcess.stderr.on('data', (data: Buffer) => {
			outputChannel.append(data.toString());
		});
		childProcess.on('close', (code) => {
			isRunning = false;
			updateButtonCommand();
			if (code !== 0) {
				outputChannel.appendLine(`Process exited with code ${code}`);
			}
		});

		isRunning = true;
		updateButtonCommand();
		if (shouldOpenWebUI) {
			if (webviewPanel) {
				webviewPanel.reveal(vscode.ViewColumn.One);
			} else {
				webviewPanel = createWebviewPanel(context);
			}
		}

	});

	let stopDisposable = vscode.commands.registerCommand('extension.stopSimulation', () => {
		stopSimulation(outputChannel);
	});

	let GUIdisposable = vscode.commands.registerCommand('extension.showWebInterface', () => {
		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			'webInterface', // Identifies the type of the webview. Used internally
			'Mumax Interface', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{
				// Enable scripts in the webview
				enableScripts: true
			}
		);

		// And set its HTML content
		const config = vscode.workspace.getConfiguration();
		const webInterfaceUrl = config.get('mx3.webInterfaceUrl') as string;

		panel.webview.html = getWebviewContent(webInterfaceUrl);
	});

	context.subscriptions.push(runDisposable, stopDisposable, GUIdisposable);
}

function createWebviewPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
	const panel = vscode.window.createWebviewPanel(
		'webInterface',
		'Mumax WebUI',
		vscode.ViewColumn.One,
		{ enableScripts: true }
	);

	const config = vscode.workspace.getConfiguration();
	const webInterfaceUrl = config.get('mx3.webInterfaceUrl') as string;

	panel.webview.html = getWebviewContent(webInterfaceUrl);

	// Handle when the panel is disposed (when the user closes the panel)
	panel.onDidDispose(() => {
		webviewPanel = undefined;
	}, null, context.subscriptions);

	return panel;
}

function getWebviewContent(webInterfaceUrl: string) {
	return `
        <!DOCTYPE html>
        <html style="height: 100%;">
        <head>
            <meta charset="UTF-8">
            <style>
                body, html {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    overflow: hidden;
                }
                iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                }
            </style>
        </head>
        <body>
            <iframe src="${webInterfaceUrl}"></iframe>
        </body>
        </html>
    `;
}

function updateButtonCommand() {
	vscode.commands.executeCommand('setContext', 'isRunning', isRunning);
}
function stopSimulation(outputChannel: vscode.OutputChannel) {
	if (childProcess && typeof childProcess.pid === 'number') {
		try {
			process.kill(childProcess.pid); // Kill the process group
			outputChannel.appendLine('Process was stopped.');
		} catch (error) {
			outputChannel.appendLine(`Failed to stop the process: ${error}`);
		}
	} else {
		outputChannel.appendLine('No running process to stop.');
	}

	isRunning = false;
	updateButtonCommand();
}

