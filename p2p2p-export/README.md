# p2p2p PlantUML to PDF Export

This Visual Studio Code extension exports the currently active `.puml` diagram to a PDF via LaTeX. It wraps the provided PlantUML → LaTeX logic and shells out to `plantuml` and `pdflatex` (or compatible LaTeX installation).

## Features
- Detects the active editor file and ensures it is a saved `.puml` document.
- Generates a temporary LaTeX file, compiles it to PDF, and saves the PDF next to the source `.puml` file.
- Optional logo placement above the diagram (configured via `p2p2p.logoPath`).
- Shows output in a dedicated channel and opens the resulting PDF inside VS Code.

## Requirements
- `plantuml` available on your `PATH`.
- `pdflatex` (or a LaTeX distribution that provides it) available on your `PATH`.

## Extension Settings
- `p2p2p.logoPath`: Optional path to an image file to display above the UML diagram in the generated PDF.

## Usage
1. Open a `.puml` file in the editor.
2. Run the command **p2p2p: Export PlantUML to PDF** (command ID: `p2p2p.exportPDF`).
3. On success, a notification appears with a link to open the generated PDF.

Errors and tool output are captured in the *p2p2p Export* output channel.
