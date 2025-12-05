## P2P2P PlantUML to PDF Exporter

## This VS Code extension converts PlantUML (.puml) diagrams into PDF documents using your local tools. All processing is done on your machine — nothing is sent to a cloud service. This makes it safe for confidential diagrams and internal documentation.

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
