# PHP in Vue - VSCode Extension

This extension provides PHP syntax highlighting and IntelliSense support for PHP code inside Vue files when using the `<php>` tag.

## Features

- **Syntax Highlighting**: Full PHP syntax highlighting within `<php>` tags in Vue files
- **IntelliSense**: Auto-completion, hover information, and other language features powered by Intelephense
- **Error Detection**: PHP syntax errors and warnings within Vue files

## Requirements

- [Intelephense](https://marketplace.visualstudio.com/items?itemName=bmewburn.vscode-intelephense-client) extension must be installed for IntelliSense features

## Usage

1. Install this extension
2. Install the Intelephense extension
3. Open a Vue file with PHP code blocks:

```vue
<template>
  <div>{{ message }}</div>
</template>

<php>
  $message = "Hello from PHP!";
  echo $message;
</php>
```

The PHP code inside `<php>` tags will have:

- Syntax highlighting
- Auto-completion
- Hover information
- Error detection

## Configuration

You can disable the extension by setting:

```json
{
  "phpInVue.enable": false
}
```

## Development

To set up the development environment:

1. Install dependencies: `npm install`
2. Compile TypeScript: `npm run compile`
3. Open in VSCode and press F5 to launch a new Extension Development Host window

## Publishing

```bash
npm run publish
```

## License

MIT
