import React, { useState } from 'react';
import {
  ShieldCheck,
  Network,
  BookOpen,
  Trophy,
  Terminal,
  SlidersHorizontal,
  FolderArchive,
  RefreshCw,
  Activity,
  FileCode2,
  Download,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { UfwConfig } from '../types';
import { downloadProjectZip } from '../utils/zipExporter';

export type ActiveTab =
  | 'topology'
  | 'simulator'
  | 'guide'
  | 'challenges'
  | 'terminal'
  | 'rules'
  | 'logs'
  | 'docker-files';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  ufwConfig: UfwConfig;
  onResetDefaults: () => void;
  completedChallengesCount: number;
  totalChallengesCount: number;
  logsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  ufwConfig,
  onResetDefaults,
  completedChallengesCount,
  totalChallengesCount,
  logsCount,
}) => {
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      await downloadProjectZip(ufwConfig, 'laboratorio-firewall-windows.zip');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Error al descargar ZIP:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-indigo-600/20 border border-cyan-500/40 text-cyan-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
              {ufwConfig.enabled && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  Laboratorio de Firewall & Redes
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Docker Desktop &bull; UFW
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400">
                Segmentación de tráfico Nginx, Ubuntu UFW y tablas de enrutamiento
              </p>
            </div>
          </div>

          {/* Quick status, Download ZIP & reset */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <span className="text-slate-400">Firewall UFW:</span>
              <span
                className={`font-semibold flex items-center gap-1.5 ${
                  ufwConfig.enabled ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    ufwConfig.enabled ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                {ufwConfig.enabled ? 'Activo' : 'Inactivo'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">IP Forward:</span>
              <span
                className={`font-semibold ${
                  ufwConfig.ipForwardingEnabled ? 'text-cyan-400' : 'text-amber-400'
                }`}
              >
                {ufwConfig.ipForwardingEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Direct 1-Click ZIP Download button in Header */}
            <button
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              title="Descargar todos los archivos para Docker Desktop en Windows (.ZIP)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-purple-500 to-indigo-400 hover:from-purple-400 hover:to-indigo-300 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {isDownloadingZip ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Generando...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">¡Listo!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .ZIP</span>
                </>
              )}
            </button>

            <button
              onClick={onResetDefaults}
              title="Restablecer laboratorio a valores iniciales"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2 -mb-px text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('topology')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'topology'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Network className="w-4 h-4 text-cyan-400" />
            <span>Topología & Simulador</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Guía Paso a Paso</span>
          </button>

          <button
            onClick={() => setActiveTab('challenges')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'challenges'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Desafíos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {completedChallengesCount}/{totalChallengesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Terminal CLI</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span>Reglas & Rutas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
              {ufwConfig.rules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Activity className="w-4 h-4 text-rose-400" />
            <span>Logs de Tráfico</span>
            {logsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {logsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('docker-files')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'docker-files'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <FolderArchive className="w-4 h-4 text-purple-400" />
            <span>Archivos Docker Windows</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
