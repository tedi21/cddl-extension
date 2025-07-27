import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	Hover,
	HoverParams,
	MarkupContent,
	RequestType,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { cddl_ruby, cddl_operation } from '../pkg/async-cddl-ruby';
import { standardPrelude, controlOperators } from './keywords';
//import { URI } from 'vscode-uri';

interface GenerateParams {
	uri: string;
}

namespace GenerateRequest {
	export const type = new RequestType<GenerateParams, string, void>('cddllsp.generate');
}

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Full,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true,
				triggerCharacters: ['.'],
			},
			hoverProvider: true,
		},
	};
	return result;
});

connection.onInitialized(() => {
	connection.console.log("On Initialized");

});

connection.onRequest(GenerateRequest.type, async (params) => {
  connection.console.log("On Request");
  let doc = documents.get(params.uri);
  if (doc) {
	let text = doc.getText();
	const res = await cddl_ruby(cddl_operation.GENERATE, text);
	return res.output.replace(/\*\*\*[^\n]*\n?/g,'').replace(/\x1B\[0;32;103m%%%\x1B\[0m/g,'BEGIN ERROR>>>').replace(/\x1B\[0;31;103m%%%\x1B\[0m/g,'<<<END ERROR');
  }
  return "No document found for URI: " + params.uri;
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	connection.console.log("On Change ");
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // The validator creates diagnostics for all uppercase words length 2 and more
  let text = textDocument.getText();
  let diagnostics: Diagnostic[] = [];

  const res = await cddl_ruby(cddl_operation.VERIFY, text);
  const regex = /\*\*\* Parse error at (\d+) upto (\d+) of \d+ \(\d+\)\./g;
  const match = regex.exec(res.output);
  if (match) {
    console.log(match[1] + '  ' + match[2]);
	let diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Error,
		range: {
			start: textDocument.positionAt(parseInt(match[1])),
			end: textDocument.positionAt(parseInt(match[2])),
		},
		message: 'syntax error',
		source: 'cddl',
	};

	diagnostics.push(diagnostic);
  }

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

let triggeredOnControl = false;

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		let completionItems: CompletionItem[] = [];

		connection.console.log("On Completion");

		// Get first two characters at current position
		let chars = documents.get(textDocumentPosition.textDocument.uri)?.getText({
			start: {
				character: textDocumentPosition.position.character - 1,
				line: textDocumentPosition.position.line,
			},
			end: {
				character: textDocumentPosition.position.character + 1,
				line: textDocumentPosition.position.line
			}
		});

		// If character is leading '.', then only emit controls
		if (chars && chars[0] === '.') {
			triggeredOnControl = true;

			for (let index = 0; index < controlOperators.length; index++) {
				completionItems[index] = {
					label: controlOperators[index].label,
					kind: CompletionItemKind.Keyword,
					data: index,
					documentation: controlOperators[index].documentation,
				};
			}

			return completionItems;
		}

		for (let index = 0; index < standardPrelude.length; index++) {
			completionItems[index] = {
				label: standardPrelude[index].label,
				kind: CompletionItemKind.Keyword,
				data: index,
				documentation: standardPrelude[index].documentation,
			};
		}

		return completionItems;
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {

		connection.console.log("On Completion Resolve");

		if (triggeredOnControl) {
			for (let index = 0; index < controlOperators.length; index++) {
				if (item.data === index) {
					item.insertText = item.label.substring(1);
					return item;
				}
			}
		}

		for (let index = 0; index < standardPrelude.length; index++) {
			if (item.data === index) {
				item.detail = standardPrelude[index].detail;
				break;
			}
		}

		return item;
	}
);

connection.onHover((params: HoverParams): Hover | undefined => {

	connection.console.log("On hover");

	// TODO: If identifier is a single character followed immediately by some
	// delimiter without any space in between, this sometimes gets tripped up
	let identifier = getIdentifierAtPosition(params);

	if (identifier === undefined) {
		return undefined;
	}

	for (const itemDetail of standardPrelude) {
		if (identifier === itemDetail.label) {
			return {
				contents: itemDetail.detail,
			};
		}
	}

	for (const itemDetail of controlOperators) {
		if (identifier == itemDetail.label) {
			return {
				contents: itemDetail.documentation
					? (itemDetail.documentation as MarkupContent)
					: itemDetail.detail,
			};
		}
	}
});

function getIdentifierAtPosition(
	docParams: TextDocumentPositionParams
): string | undefined {
	let document = documents.get(docParams.textDocument.uri);

	if (document === undefined) {
		return undefined;
	}

	let documentText = document.getText();
	let offset = document.offsetAt(docParams.position);

	if (offset === undefined) {
		return undefined;
	}

	let start = offset;
	let end = offset;

	if (
		documentText &&
		(documentText.length < offset || documentText[offset] === ' ')
	) {
		return undefined;
	}

	let re = /\s|,|:|=|\*|\?|\+|<|>|{|}|\[|\]|\(|\)/;

	while (!re.test(documentText[start]) && start > 0) {
		start--;
	}
	while (!re.test(documentText[end]) && end < documentText.length) {
		end++;
	}

	return documentText?.substring(start == 0 ? 0 : start + 1, end);
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
