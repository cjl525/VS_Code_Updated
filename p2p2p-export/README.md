## P2P2P PlantUML to PDF Exporter

## This VS Code extension converts PlantUML (.puml) diagrams into PDF documents using your local tools. All processing is done on your machine.

## Features

- Offline conversion: Uses your local PlantUML JAR, Graphviz dot executable and LaTeX (pdflatex) to generate a high‑quality PDF. No external network calls are made.

- One‑click export: A status bar button is added when you open a .puml file. Click it to export the diagram to PDF.

- Command Palette integration: Run P2P2P: Export PlantUML to PDF from the Command Palette (Ctrl+Shift+P) as an alternative to the button.

- Configurable paths: Set custom paths for plantuml.jar, dot.exe, pdflatex and an optional logo image via the extension’s settings.

- Optional logo: Add a logo image at the top of the PDF by specifying a path in the settings.

## Requirements

Before using the extension you must install:

- Java Runtime (JRE) – required to run PlantUML.

- PlantUML JAR – download the jar file from the PlantUML website
  . Place it somewhere like C:\Tools\plantuml.jar.

- Graphviz – install Graphviz so that the dot.exe binary is available (e.g., under C:\Program Files\Graphviz\bin).

- LaTeX distribution – the extension calls pdflatex to compile PDFs. Install MiKTeX
   or TeX Live
   and ensure pdflatex is on your system path.

## Configuration

| Setting                 | Purpose                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `p2p2p.plantumlPath`    | Full path to `plantuml.jar` (e.g., `C:\Tools\plantuml.jar`).                                     |
| `p2p2p.graphvizDotPath` | Full path to Graphviz’s `dot.exe` (e.g., `C:\Program Files\Graphviz\bin\dot.exe`).               |
| `p2p2p.pdflatexPath`    | Path to `pdflatex` if it’s not on your system `PATH`.                                            |
| `p2p2p.logoPath`        | Optional path to a logo image.  If set, the logo appears above the diagram in the generated PDF. |

## Usage

Once everything is configured:

1. Open a PlantUML file (.puml) in VS Code.

2. Look in the bottom left of the window — you should see a button labelled Export PlantUML to PDF. Click it to start the export.

3. Alternatively, press Ctrl+Shift+P and run the command P2P2P: Export PlantUML to PDF.

4. The extension creates a temporary directory, renders the diagram to a PNG via PlantUML and Graphviz, wraps it in a LaTeX template and compiles it to PDF using pdflatex. The final PDF is saved in the same folder as your .puml file.

5. A notification prompts you to open the PDF. You can click Open PDF or dismiss the notification.

## Troubleshooting

- No PNG generated – Make sure the plantuml.jar and dot.exe paths are correct in the settings. PlantUML must be able to find Graphviz.

- PDF not created – Check that pdflatex is installed and available at the specified path. The extension relies on it to compile the LaTeX document.

- Logo not showing – Verify that the file path in p2p2p.logoPath points to an existing image file.
