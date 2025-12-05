"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
/**
 * Loads all configurable tool paths from VS Code settings.
 */
function getConfiguredPaths() {
    const config = vscode.workspace.getConfiguration("p2p2p");
    return {
        plantumlPath: config.get("plantumlPath") || "C:\\Tools\\plantuml.jar",
        graphvizDotPath: config.get("graphvizDotPath") ||
            "C:\\Program Files\\Graphviz\\bin\\dot.exe",
        pdflatexPath: config.get("pdflatexPath") || "pdflatex",
    };
}
function createLatexContent(logoPath, diagramFile) {
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
async function generatePdf(pumlPath, logoPath, outputChannel) {
    const { plantumlPath, graphvizDotPath, pdflatexPath } = getConfiguredPaths();
    const workingDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "p2p2p-"));
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
    }
    catch (error) {
        outputChannel.appendLine(`PlantUML error: ${error?.stderr || error?.message}`);
        throw new Error("Failed to generate PNG with PlantUML.");
    }
    // --- Write LaTeX ---
    const latexContent = createLatexContent(logoPath, pngFileName);
    await fs.promises.writeFile(texPath, latexContent, "utf8");
    outputChannel.appendLine("LaTeX file created.");
    // --- Compile PDF ---
    outputChannel.appendLine("Compiling PDF with pdflatex...");
    try {
        await execFileAsync(pdflatexPath, ["-interaction=nonstopmode", "-halt-on-error", texFileName], {
            cwd: workingDir,
            maxBuffer: 10 * 1024 * 1024,
        });
    }
    catch (error) {
        outputChannel.appendLine(`pdflatex error: ${error?.stderr || error?.message}`);
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
async function exportActivePlantUml() {
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
    if (document.languageId !== "plantuml" &&
        path.extname(document.fileName).toLowerCase() !== ".puml") {
        vscode.window.showErrorMessage("This is not a PlantUML (.puml) file.");
        return;
    }
    if (document.isDirty) {
        await document.save();
    }
    const config = vscode.workspace.getConfiguration("p2p2p");
    const logoPathSetting = config.get("logoPath") || "";
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
    }
    catch (error) {
        outputChannel.appendLine(error?.message || "Unknown error");
        vscode.window.showErrorMessage(error?.message || "Export failed.");
    }
}
function activate(context) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = "$(file-pdf) Export PlantUML to PDF";
    statusBarItem.command = "p2p2p.exportPDF";
    statusBarItem.tooltip = "Export the active PlantUML file to PDF";
    const updateVisibility = () => {
        const doc = vscode.window.activeTextEditor?.document;
        const isPuml = doc &&
            !doc.isUntitled &&
            (doc.languageId === "plantuml" ||
                path.extname(doc.fileName).toLowerCase() === ".puml");
        isPuml ? statusBarItem.show() : statusBarItem.hide();
    };
    updateVisibility();
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateVisibility));
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(vscode.commands.registerCommand("p2p2p.exportPDF", exportActivePlantUml));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map