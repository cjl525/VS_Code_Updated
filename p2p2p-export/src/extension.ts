import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function createLatexContent(logoPath: string | undefined, diagramFile: string): string {
  const logoBlock = logoPath
    ? `\\includegraphics[width=4cm]{${logoPath.replace(/\\/g, '/')}}\\\\[1em]`
    : '';

  return `\\documentclass{article}
\\usepackage{graphicx}
\\usepackage[margin=1in]{geometry}
\\begin{document}

\\begin{center}
${logoBlock}
\\includegraphics[width=0.6\\linewidth]{${diagramFile.replace(/\\/g, '/')}}
\\end{center}

\\end{document}
`;
}

async function generatePdf(pumlPath: string, logoPath: string | undefined, outputChannel: vscode.OutputChannel): Promise<string> {
  const workingDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'p2p2p-'));
  outputChannel.appendLine(`Using temporary directory: ${workingDir}`);

  const fileStem = path.parse(pumlPath).name;
  const pngFileName = `${fileStem}.png`;
  const texFileName = 'document.tex';
  const pdfFileName = 'document.pdf';
  const texPath = path.join(workingDir, texFileName);
  const pdfPath = path.join(workingDir, pdfFileName);

  outputChannel.appendLine('Generating PNG with PlantUML...');
  try {
    await execFileAsync('plantuml', ['-tpng', '-o', workingDir, pumlPath]);
  } catch (error: any) {
    outputChannel.appendLine(`PlantUML error: ${error?.stderr || error?.message}`);
    throw new Error('Failed to generate PNG with PlantUML.');
  }

  const latexContent = createLatexContent(logoPath, pngFileName);
  await fs.promises.writeFile(texPath, latexContent, 'utf8');
  outputChannel.appendLine('LaTeX template created successfully.');

  outputChannel.appendLine('Compiling PDF with pdflatex...');
  try {
    await execFileAsync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', texFileName], {
      cwd: workingDir,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error: any) {
    outputChannel.appendLine(`pdflatex error: ${error?.stderr || error?.message}`);
    throw new Error('Failed to compile PDF with LaTeX.');
  }

  if (!fs.existsSync(pdfPath)) {
    throw new Error('Expected PDF was not generated.');
  }

  const finalPdfPath = path.join(path.dirname(pumlPath), `${fileStem}.pdf`);
  await fs.promises.copyFile(pdfPath, finalPdfPath);
  outputChannel.appendLine(`PDF saved to ${finalPdfPath}`);

  return finalPdfPath;
}

async function exportActivePlantUml(): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('p2p2p Export');
  outputChannel.show(true);

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor. Open a .puml file to export.');
    return;
  }

  const document = editor.document;
  if (document.isUntitled) {
    vscode.window.showErrorMessage('Please save the .puml file before exporting.');
    return;
  }

  if (document.languageId !== 'plantuml' && path.extname(document.fileName).toLowerCase() !== '.puml') {
    vscode.window.showErrorMessage('The active file is not a .puml PlantUML document.');
    return;
  }

  if (document.isDirty) {
    await document.save();
  }

  const configuration = vscode.workspace.getConfiguration('p2p2p');
  const logoPathSetting = configuration.get<string>('logoPath') || '';
  const logoPath = logoPathSetting.trim() || undefined;

  try {
    const pdfPath = await generatePdf(document.fileName, logoPath, outputChannel);
    const openAction = 'Open PDF';
    vscode.window.showInformationMessage(`PlantUML exported to PDF: ${pdfPath}`, openAction).then((selection) => {
      if (selection === openAction) {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(pdfPath));
      }
    });
  } catch (error: any) {
    const message = error?.message || 'Unknown error during export.';
    outputChannel.appendLine(message);
    vscode.window.showErrorMessage(message);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = '$(file-pdf) Export PlantUML to PDF';
  statusBarItem.command = 'p2p2p.exportPDF';
  statusBarItem.tooltip = 'Export the active PlantUML file to PDF';

  const updateStatusBarVisibility = () => {
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    const isPuml =
      document &&
      !document.isUntitled &&
      (document.languageId === 'plantuml' || path.extname(document.fileName).toLowerCase() === '.puml');

    if (isPuml) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };

  updateStatusBarVisibility();
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarVisibility));
  context.subscriptions.push(statusBarItem);

  const disposable = vscode.commands.registerCommand('p2p2p.exportPDF', exportActivePlantUml);
  context.subscriptions.push(disposable);
}

export function deactivate() {}
