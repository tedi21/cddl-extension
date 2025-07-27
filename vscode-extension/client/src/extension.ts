import * as path from 'path';
import { 
	ExtensionContext,
	TextDocumentContentProvider,
	EventEmitter,
	Uri,
	workspace,
	window,
	commands,
	ViewColumn,
 } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	RequestType
} from 'vscode-languageclient/node';

interface GenerateParams {
	uri: string;
}

namespace GenerateRequest {
	export const type = new RequestType<GenerateParams, string, void>('cddllsp.generate');
}

let client: LanguageClient;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: ExtensionContext) {
	
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions,
		},
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'cddl' }],
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'cddllsp',
		'CDDL Language Server',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();
  
	// register a content provider for the cddlGenerator-scheme
	const cddlGeneratorScheme = 'cddllsp';
	const cddlGeneratorProvider = new class implements TextDocumentContentProvider {

		// emitter and its event
		onDidChangeEmitter = new EventEmitter<Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		async provideTextDocumentContent(uri: Uri): Promise<string> {
			// simply invoke client
			const queryParams = new URLSearchParams(uri.query);
			const fsPath = queryParams.get('fsPath');
			let params: GenerateParams = { uri: client.code2ProtocolConverter.asUri(Uri.file(fsPath)) };
			return await client.sendRequest(GenerateRequest.type, params);
		}
	};
	context.subscriptions.push(workspace.registerTextDocumentContentProvider(cddlGeneratorScheme, cddlGeneratorProvider));

	// register a command that opens a generated document
	context.subscriptions.push(commands.registerCommand('cddllsp.generator', async () => {
		let activeDoc = window.activeTextEditor.document;
		const fsPath = activeDoc.uri.fsPath;
		const version = activeDoc.version;
		const uri = Uri.parse('cddllsp:CddlToJson?fsPath=' + fsPath + '&version=' + version);
		const doc = await workspace.openTextDocument(uri); // calls back into the provider
		await window.showTextDocument(doc, { viewColumn: ViewColumn.Beside, preserveFocus: true });
	}));

}

// This method is called when your extension is deactivated
export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
