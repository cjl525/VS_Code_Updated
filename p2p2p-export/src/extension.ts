import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Loads all configurable tool paths from VS Code settings.
 */
function getConfiguredPaths() {
  const config = vscode.workspace.getConfiguration("p2p2p");

  return {
    plantumlPath: config.get<string>("plantumlPath") || "C:\\Tools\\plantuml.jar",
    graphvizDotPath:
      config.get<string>("graphvizDotPath") ||
      "C:\\Program Files\\Graphviz\\bin\\dot.exe",
    pdflatexPath: config.get<string>("pdflatexPath") || "pdflatex",
  };
}

function createLatexContent(
  logoPath: string | undefined,
  diagramFile: string
): string {
  const logoBlock = logoPath
    ? `\\includegraphics[width=4cm]{${logoPath.replace(/\\/g, "/")}}\\\\[1em]`
    : "";

  return `\\documentclass{article}
\\usepackage{graphicx}
\\usepackage[margin=1in]{geometry}
\\begin{document}

\\begin{center}
${logoBlock}
\\includegraphics[width=0.6\\linewidth]{${diagramFile.replace(/\\/g, "/")}}
\\end{center}

\\end{document}
`;
}

async function generatePdf(
  pumlPath: string,
  logoPath: string | undefined,
  outputChannel: vscode.OutputChannel
): Promise<string> {
  const { plantumlPath, graphvizDotPath, pdflatexPath } = getConfiguredPaths();

  const workingDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "p2p2p-")
  );
  outputChannel.appendLine(`Using temporary directory: ${workingDir}`);

  const fileStem = path.parse(pumlPath).name;
  const pngFileName = `${fileStem}.png`;
  const texFileName = "document.tex";
  const pdfFileName = "document.pdf";

  const texPath = path.join(workingDir, texFileName);
  const pdfPath = path.join(workingDir, pdfFileName);

  // --- Generate PNG ---
  outputChannel.appendLine("Generating PNG with PlantUML...");
  try {
    await execFileAsync("java", [
      "-jar",
      plantumlPath,
      "-tpng",
      "-graphvizdot",
      graphvizDotPath,
      "-o",
      workingDir,
      pumlPath,
    ]);
  } catch (error: any) {
    outputChannel.appendLine(
      `PlantUML error: ${error?.stderr || error?.message}`
    );
    throw new Error("Failed to generate PNG with PlantUML.");
  }

  // --- Write LaTeX ---
  const latexContent = createLatexContent(logoPath, pngFileName);
  await fs.promises.writeFile(texPath, latexContent, "utf8");
  outputChannel.appendLine("LaTeX file created.");

  // --- Compile PDF ---
  outputChannel.appendLine("Compiling PDF with pdflatex...");
  try {
    await execFileAsync(
      pdflatexPath,
      ["-interaction=nonstopmode", "-halt-on-error", texFileName],
      {
        cwd: workingDir,
        maxBuffer: 10 * 1024 * 1024,
      }
    );
  } catch (error: any) {
    outputChannel.appendLine(
      `pdflatex error: ${error?.stderr || error?.message}`
    );
    throw new Error("Failed to compile PDF with LaTeX.");
  }

  if (!fs.existsSync(pdfPath)) {
    throw new Error("Expected PDF was not generated.");
  }

  // --- Move PDF next to source file ---
  const finalPdfPath = path.join(path.dirname(pumlPath), `${fileStem}.pdf`);
  await fs.promises.copyFile(pdfPath, finalPdfPath);

  outputChannel.appendLine(`PDF saved to: ${finalPdfPath}`);

  return finalPdfPath;
}

async function exportActivePlantUml(): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel("p2p2p Export");
  outputChannel.show(true);

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor. Open a .puml file first.");
    return;
  }

  const document = editor.document;

  if (document.isUntitled) {
    vscode.window.showErrorMessage("Please save the .puml file before exporting.");
    return;
  }

  if (
    document.languageId !== "plantuml" &&
    path.extname(document.fileName).toLowerCase() !== ".puml"
  ) {
    vscode.window.showErrorMessage("This is not a PlantUML (.puml) file.");
    return;
  }

  if (document.isDirty) {
    await document.save();
  }

  const config = vscode.workspace.getConfiguration("p2p2p");
  const logoPathSetting = config.get<string>("logoPath") || "";
  const logoPath = logoPathSetting.trim() || undefined;

  try {
    const pdfPath = await generatePdf(document.fileName, logoPath, outputChannel);

    vscode.window
      .showInformationMessage(`Export complete: ${pdfPath}`, "Open PDF")
      .then((selection) => {
        if (selection === "Open PDF") {
          vscode.commands.executeCommand("vscode.open", vscode.Uri.file(pdfPath));
        }
      });
  } catch (error: any) {
    outputChannel.appendLine(error?.message || "Unknown error");
    vscode.window.showErrorMessage(error?.message || "Export failed.");
  }
}

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  statusBarItem.text = "$(file-pdf) Export PlantUML to PDF";
  statusBarItem.command = "p2p2p.exportPDF";
  statusBarItem.tooltip = "Export the active PlantUML file to PDF";

  const updateVisibility = () => {
    const doc = vscode.window.activeTextEditor?.document;
    const isPuml =
      doc &&
      !doc.isUntitled &&
      (doc.languageId === "plantuml" ||
        path.extname(doc.fileName).toLowerCase() === ".puml");

    isPuml ? statusBarItem.show() : statusBarItem.hide();
  };

  updateVisibility();
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateVisibility)
  );
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand("p2p2p.exportPDF", exportActivePlantUml)
  );
}

export function deactivate() {}
