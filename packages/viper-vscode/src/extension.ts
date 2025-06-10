import * as vscode from "vscode";
import type {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;
const virtualDocuments = new Map<string, string>();
let documentProvider: VirtualDocumentProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log("PHP in Vue extension is now active!");

  // Check if the extension is enabled
  const config = vscode.workspace.getConfiguration("phpInVue");
  if (!config.get("enable", true)) {
    return;
  }

  // Register virtual document content provider
  documentProvider = new VirtualDocumentProvider();
  const registration = vscode.workspace.registerTextDocumentContentProvider(
    "php-in-vue",
    documentProvider,
  );
  context.subscriptions.push(registration);

  // Set up language client to connect with Intelephense
  setupLanguageClient(context);

  // Listen for Vue file changes to update virtual documents
  const watcher = vscode.workspace.onDidChangeTextDocument(
    (event: vscode.TextDocumentChangeEvent) => {
      if (event.document.languageId === "vue") {
        updateVirtualDocument(event.document);
      }
    },
  );
  context.subscriptions.push(watcher);

  // Handle active editor changes
  const editorWatcher = vscode.window.onDidChangeActiveTextEditor(
    (editor: vscode.TextEditor | undefined) => {
      if (editor && editor.document.languageId === "vue") {
        updateVirtualDocument(editor.document);
      }
    },
  );
  context.subscriptions.push(editorWatcher);

  // Process currently open Vue files
  for (const doc of vscode.workspace.textDocuments) {
    if (doc.languageId === "vue") {
      updateVirtualDocument(doc);
    }
  }
}

class VirtualDocumentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidChange = this._onDidChange.event;

  provideTextDocumentContent(uri: vscode.Uri): string {
    return virtualDocuments.get(uri.toString()) || "";
  }

  update(uri: vscode.Uri, content: string) {
    virtualDocuments.set(uri.toString(), content);
    this._onDidChange.fire(uri);
  }
}

function updateVirtualDocument(document: vscode.TextDocument) {
  console.log("Updating virtual document for:", document.uri.fsPath);
  const phpContent = extractPhpContent(document.getText());
  console.log("Extracted PHP content:", phpContent);
  if (phpContent) {
    const virtualUri = vscode.Uri.parse(
      `php-in-vue:${document.uri.fsPath}.php`,
    );
    // Update the virtual document
    virtualDocuments.set(virtualUri.toString(), phpContent);
    console.log("Virtual document created:", virtualUri.toString());

    // Notify the provider that the document has changed
    documentProvider.update(virtualUri, phpContent);
  } else {
    console.log("No PHP content found in document");
  }
}

function extractPhpContent(vueContent: string): string {
  const phpBlocks: string[] = [];
  const phpBlockRegex = /<php[^>]*>([\s\S]*?)<\/php>/g;
  let match: RegExpExecArray | null = null;

  while ((match = phpBlockRegex.exec(vueContent)) !== null) {
    phpBlocks.push(match[1]);
  }

  if (phpBlocks.length === 0) {
    return "";
  }

  // Wrap in PHP tags for proper language server recognition
  return `<?php\n${phpBlocks.join("\n\n")}`;
}

function setupLanguageClient(context: vscode.ExtensionContext) {
  // Check if Intelephense extension is available
  const intelephenseExtension = vscode.extensions.getExtension(
    "bmewburn.vscode-intelephense-client",
  );

  if (!intelephenseExtension) {
    vscode.window
      .showWarningMessage(
        "Intelephense extension not found. PHP IntelliSense in Vue files requires Intelephense to be installed.",
        "Install Intelephense",
      )
      .then((selection: string | undefined) => {
        if (selection === "Install Intelephense") {
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.parse(
              "vscode:extension/bmewburn.vscode-intelephense-client",
            ),
          );
        }
      });
    return;
  }

  // Register completion provider for Vue files
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    { scheme: "file", language: "vue" },
    new PhpInVueCompletionProvider(),
    ">",
    "$",
    ":",
  );
  context.subscriptions.push(completionProvider);

  // Register hover provider
  const hoverProvider = vscode.languages.registerHoverProvider(
    { scheme: "file", language: "vue" },
    new PhpInVueHoverProvider(),
  );
  context.subscriptions.push(hoverProvider);
}

class PhpInVueCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ): Promise<vscode.CompletionItem[]> {
    console.log("Completion requested at position:", position);

    // Check if we're inside a PHP block
    if (!isInPhpBlock(document, position)) {
      console.log("Not in PHP block");
      return [];
    }

    console.log("Inside PHP block, proceeding with completion");

    // Extract PHP content and get relative position
    const phpContent = extractPhpContent(document.getText());
    if (!phpContent) {
      return [];
    }

    try {
      // Create a virtual PHP document URI
      const virtualUri = vscode.Uri.parse(
        `php-in-vue:${document.uri.fsPath}.php`,
      );

      // Get PHP position within the extracted content
      const phpPosition = convertToPhpPosition(document, position);
      if (!phpPosition) {
        return [];
      }

      // Request completions from PHP language features
      console.log(
        "Requesting completions from virtual URI:",
        virtualUri.toString(),
      );
      console.log("At PHP position:", phpPosition);

      const completions =
        await vscode.commands.executeCommand<vscode.CompletionList>(
          "vscode.executeCompletionItemProvider",
          virtualUri,
          phpPosition,
        );

      console.log("Received completions:", completions);
      const items = completions?.items || [];
      console.log("Returning items count:", items.length);
      console.log("First few items:", items.slice(0, 3));

      // Log detailed info about first item
      if (items.length > 0) {
        console.log("First item detailed:", JSON.stringify(items[0], null, 2));
        console.log("First item label:", items[0].label);
        console.log("First item kind:", items[0].kind);
      }

      // Convert Intelephense items to fresh VSCode completion items
      console.log("Converting Intelephense items to fresh completion items");
      const convertedItems = items.slice(0, 20).map((item: any) => {
        const newItem = new vscode.CompletionItem(
          item.label,
          item.kind || vscode.CompletionItemKind.Text,
        );

        if (item.documentation) {
          newItem.documentation = item.documentation;
        }
        if (item.insertText) {
          newItem.insertText = item.insertText;
        }
        if (item.detail) {
          newItem.detail = item.detail;
        }

        return newItem;
      });

      // Add test items for verification
      const testItems = [
        new vscode.CompletionItem(
          "$test_variable",
          vscode.CompletionItemKind.Variable,
        ),
        new vscode.CompletionItem("echo", vscode.CompletionItemKind.Keyword),
      ];

      console.log(
        "Returning converted items count:",
        convertedItems.length + testItems.length,
      );
      return [...testItems, ...convertedItems];
    } catch (error) {
      console.error("Error getting PHP completions:", error);
      return [];
    }
  }
}

class PhpInVueHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | null> {
    // Check if we're inside a PHP block
    if (!isInPhpBlock(document, position)) {
      return null;
    }

    try {
      const virtualUri = vscode.Uri.parse(
        `php-in-vue:${document.uri.fsPath}.php`,
      );
      const phpPosition = convertToPhpPosition(document, position);

      if (!phpPosition) {
        return null;
      }

      const hover = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        virtualUri,
        phpPosition,
      );

      return hover?.[0] || null;
    } catch (error) {
      console.error("Error getting PHP hover:", error);
      return null;
    }
  }
}

function isInPhpBlock(
  document: vscode.TextDocument,
  position: vscode.Position,
): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find all PHP blocks and check if position is within any of them
  const phpBlockRegex = /<php[^>]*>([\s\S]*?)<\/php>/g;
  let match: RegExpExecArray | null = null;

  while ((match = phpBlockRegex.exec(text)) !== null) {
    const start = match.index + match[0].indexOf(">") + 1;
    const end = match.index + match[0].lastIndexOf("</php>");

    if (offset >= start && offset <= end) {
      return true;
    }
  }

  return false;
}

function convertToPhpPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): vscode.Position | null {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find which PHP block contains this position
  const phpBlockRegex = /<php[^>]*>([\s\S]*?)<\/php>/g;
  let match: RegExpExecArray | null = null;
  let phpOffset = 0;

  // Account for the opening <?php tag
  phpOffset += "<?php\n".length;

  while ((match = phpBlockRegex.exec(text)) !== null) {
    const blockStart = match.index + match[0].indexOf(">") + 1;
    const blockEnd = match.index + match[0].lastIndexOf("</php>");

    if (offset >= blockStart && offset <= blockEnd) {
      // Position is within this block
      const relativeOffset = offset - blockStart;
      const phpContent = match[1];
      const lines = phpContent.substring(0, relativeOffset).split("\n");
      const line = lines.length - 1 + 1; // +1 for the <?php line
      const character = lines[lines.length - 1].length;

      return new vscode.Position(line, character);
    }

    // Add this block's content length for next iteration
    phpOffset += match[1].length + "\n\n".length;
  }

  return null;
}

export function deactivate() {
  if (client) {
    return client.stop();
  }
}
