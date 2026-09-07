import React, { useState } from 'react';
import {
  FolderArchive,
  FileCode2,
  Copy,
  Check,
  Download,
  Terminal,
  FileText,
  Layers,
  Sparkles,
  Monitor,
  Archive,
  CheckCircle2,
  Cpu,
  ArrowDownToLine,
  Loader2,
} from 'lucide-react';
import { DOCKER_PROJECT_FILES, DockerProjectFile } from '../data/dockerProjectFiles';
import { UfwConfig } from '../types';
import { downloadProjectZip } from '../utils/zipExporter';

interface DockerFilesExportProps {
  ufwConfig?: UfwConfig;
}

export const DockerFilesExport: React.FC<DockerFilesExportProps> = ({ ufwConfig }) => {
  const [selectedFile, setSelectedFile] = useState<DockerProjectFile>(DOCKER_PROJECT_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedAllScript, setCopiedAllScript] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipDownloaded, setZipDownloaded] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZipArchive = async () => {
    try {
      setIsZipping(true);
      await downloadProjectZip(ufwConfig, 'laboratorio-firewall-windows.zip');
      setZipDownloaded(true);
      setTimeout(() => setZipDownloaded(false), 3000);
    } catch (err) {
      console.error('Error al generar el archivo .zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const generatePowerShellQuickStart = () => {
    return `# Script de creación rápida del laboratorio en Windows PowerShell
New-Item -ItemType Directory -Force -Path "laboratorio-firewall/firewall", "laboratorio-firewall/nginx-dmz/html", "laboratorio-firewall/nginx-internal/html"
Set-Location "laboratorio-firewall"

# Crea docker-compose.yml y levanta el entorno
docker compose up -d --build
`;
  };

  const handleCopyQuickStart = () => {
    navigator.clipboard.writeText(generatePowerShellQuickStart());
    setCopiedAllScript(true);
    setTimeout(() => setCopiedAllScript(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Big Hero Banner for 1-Click ZIP Download */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 p-5 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Archive className="w-3.5 h-3.5 text-purple-300" />
              <span>Paquete Completo para Windows (.ZIP)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Descarga el Laboratorio Listo para Ejecutar
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Descarga un archivo <strong>.zip</strong> con toda la estructura de carpetas, el archivo <code className="text-purple-300 font-mono">docker-compose.yml</code>, los contenedores <strong>Nginx</strong>, el <strong>Firewall Ubuntu UFW</strong>, scripts <code className="text-emerald-300 font-mono">iniciar-laboratorio.bat</code> y la guía completa de instrucciones.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Doble clic para iniciar en Windows
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Compatible con Docker Desktop & WSL 2
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Incluye pruebas automáticas y guía
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={handleDownloadZipArchive}
              disabled={isZipping}
              className="w-full md:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 shadow-xl hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 transform active:scale-95"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>Empaquetando ZIP...</span>
                </>
              ) : zipDownloaded ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-slate-950" />
                  <span>¡Descarga Iniciada!</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-5 h-5" />
                  <span>Descargar .ZIP para Windows</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 font-mono">
              laboratorio-firewall-windows.zip (~15 KB)
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: File Selector + Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File Tree Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Explorador de Archivos
                </h3>
              </div>
              <span className="text-xs text-purple-400 font-mono font-bold">
                {DOCKER_PROJECT_FILES.length} archivos
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Selecciona cualquier archivo para inspeccionar su código fuente o descargarlo individualmente:
            </p>

            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {DOCKER_PROJECT_FILES.map((file) => {
                const isSelected = selectedFile.path === file.path;

                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border font-mono text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-sm ring-1 ring-purple-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode2 className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="truncate">{file.path}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-500 uppercase shrink-0">
                      {file.language}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Windows Steps */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span>Instrucciones en Windows:</span>
            </div>
            <ol className="list-decimal list-inside text-slate-400 space-y-1.5 leading-relaxed">
              <li>Descarga y descomprime el archivo <strong className="text-white">.ZIP</strong> en tu computadora.</li>
              <li>Abre <strong>Docker Desktop</strong> y verifica que esté activo.</li>
              <li>Haz doble clic en <code className="text-emerald-300 font-mono">iniciar-laboratorio.bat</code>.</li>
              <li>Abre tu navegador en <code className="text-cyan-300 font-mono">http://localhost:8080</code> para ver el servidor DMZ.</li>
            </ol>
          </div>
        </div>

        {/* Code Viewer Panel */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl flex flex-col h-[540px]">
            {/* File Header */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-purple-400" />
                  <span className="font-mono text-xs sm:text-sm font-bold text-white">
                    {selectedFile.path}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedFile.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copiado' : 'Copiar Archivo'}</span>
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Archivo</span>
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 p-4 overflow-auto font-mono text-xs bg-slate-950 text-slate-200 select-all leading-relaxed">
              <pre className="whitespace-pre">{selectedFile.content}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
