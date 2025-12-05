"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);

// -------------------------------------------------------------
// LATEX TEMPLATE
// -------------------------------------------------------------
function createLatexContent(logoPath, diagramPath) {
    const logoBlock = logoPath
        ? `\\includegraphics[width=4cm]{${logoPath.replace(/\\/g, '/')}}\\\\[1em]`
        : "";

    return `\\documentclass{article}
\\usepackage{graphicx}
\\usepackage[margin=1in]{geometry}
\\begin{document}

\\begin{center}
${logoBlock}
\\includegraphics[width=0.8\\linewidth]{${diagramPath.replace(/\\/g, '/')}}
\\end{center}

\\end{document}
`;
}

// -------------------------------------------------------------
// GENERATE PDF WORKFLOW
// -------------------------------------------------------------
async function generatePdf(pumlPath, logoPath, outputChannel) {
    const workingDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "p2p2p-"));
    outputChannel.appendLine(`Using temporary directory: ${workingDir}`);

    const fileStem = path.parse(pumlPath).name;
    const texFileName = "document.tex";
    const pdfFileName = "document.pdf";
    const texPath = path.join(workingDir, texFileName);
    const pdfPath = path.join(workingDir, pdfFileName);

    // ---------------------------------------------------------
    // 1. Generate PNG with PlantUML JAR (offline)
    // ---------------------------------------------------------
    outputChannel.appendLine("Generating PNG with PlantUML...");

    try {
        await execFileAsync("java", [
            "-jar",
            "C:\\\\Tools\\\\plantuml.jar",
            "-tpng",
            "-graphvizdot",
            "C:\\\\Program Files\\\\Graphviz\\\\bin\\\\dot.exe",
            "-o",
            workingDir,
            pumlPath
        ]);


    } catch (error) {
        outputChannel.appendLine(`PlantUML error: ${error?.stderr || error?.message}`);
        throw new Error("Failed to generate PNG with PlantUML.");
    }

    // ---------------------------------------------------------
    // 2. Locate generated PNG file
    // ---------------------------------------------------------
    const pngFile = fs.readdirSync(workingDir).find(f => f.toLowerCase().endsWith(".png"));

    if (!pngFile) {
        throw new Error("PlantUML did not generate a PNG file.");
    }

    const pngPath = path.join(workingDir, pngFile);
    outputChannel.appendLine(`PNG generated: ${pngPath}`);

    // ---------------------------------------------------------
    // 3. Create LaTeX file
    // ---------------------------------------------------------
    const latexContent = createLatexContent(logoPath, pngPath);
    await fs.promises.writeFile(texPath, latexContent, "utf8");
    outputChannel.appendLine("LaTeX file created.");

    // ---------------------------------------------------------
    // 4. Compile PDF
    // ---------------------------------------------------------
    outputChannel.appendLine("Compiling PDF with pdflatex...");

    try {
        await execFileAsync("pdflatex", [
            "-interaction=nonstopmode",
            "-halt-on-error",
            texFileName
        ], {
            cwd: workingDir,
            maxBuffer: 10 * 1024 * 1024
        });

    } catch (error) {
        outputChannel.appendLine(`pdflatex error: ${error?.stderr || error?.message}`);
        throw new Error("Failed to compile PDF with LaTeX.");
    }

    if (!fs.existsSync(pdfPath)) {
        throw new Error("PDF was not generated.");
    }

    // ---------------------------------------------------------
    // 5. Copy final PDF to same folder as PUML file
    // ---------------------------------------------------------
    const finalPdfPath = path.join(path.dirname(pumlPath), `${fileStem}.pdf`);
    await fs.promises.copyFile(pdfPath, finalPdfPath);

    outputChannel.appendLine(`PDF saved to ${finalPdfPath}`);

    return finalPdfPath;
}

// -------------------------------------------------------------
// COMMAND HANDLER
// -------------------------------------------------------------
async function exportActivePlantUml() {
    const outputChannel = vscode.window.createOutputChannel("p2p2p Export");
    outputChannel.show(true);

    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage("No active editor. Open a .puml file.");
        return;
    }

    const document = editor.document;

    if (document.isUntitled) {
        vscode.window.showErrorMessage("Please save the .puml file before exporting.");
        return;
    }

    if (document.languageId !== "plantuml" &&
        path.extname(document.fileName).toLowerCase() !== ".puml") {
        vscode.window.showErrorMessage("This is not a PlantUML (.puml) file.");
        return;
    }

    // Auto-save
    if (document.isDirty) {
        await document.save();
    }

    const config = vscode.workspace.getConfiguration("p2p2p");
    const logoPathRaw = config.get("logoPath") || "";
    const logoPath = logoPathRaw.trim() || undefined;

    try {
        const pdfPath = await generatePdf(document.fileName, logoPath, outputChannel);
        
        vscode.window.showInformationMessage(
            `Exported PDF: ${pdfPath}`,
            "Open PDF"
        ).then(sel => {
            if (sel === "Open PDF") {
                vscode.commands.executeCommand("vscode.open", vscode.Uri.file(pdfPath));
            }
        });

    } catch (err) {
        const message = err?.message || "Unknown error.";
        outputChannel.appendLine(message);
        vscode.window.showErrorMessage(message);
    }
}

// -------------------------------------------------------------
// ACTIVATE EXTENSION
// -------------------------------------------------------------
function activate(context) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = "$(file-pdf) Export PlantUML to PDF";
    statusBarItem.command = "p2p2p.exportPDF";
    statusBarItem.tooltip = "Export active PlantUML file to PDF";

    const updateStatusBar = () => {
        const editor = vscode.window.activeTextEditor;
        const doc = editor?.document;
        const isPuml = doc &&
            !doc.isUntitled &&
            (doc.languageId === "plantuml" ||
             path.extname(doc.fileName).toLowerCase() === ".puml");

        if (isPuml) statusBarItem.show();
        else statusBarItem.hide();
    };

    updateStatusBar();

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
        statusBarItem
    );

    const disposable = vscode.commands.registerCommand("p2p2p.exportPDF", exportActivePlantUml);
    context.subscriptions.push(disposable);
}

function deactivate() {}

