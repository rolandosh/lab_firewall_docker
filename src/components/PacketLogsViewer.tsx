import React, { useState } from 'react';
import {
  Activity,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Terminal,
} from 'lucide-react';
import { SimulationResult } from '../types';

interface PacketLogsViewerProps {
  logs: SimulationResult[];
  onClearLogs: () => void;
}

export const PacketLogsViewer: React.FC<PacketLogsViewerProps> = ({ logs, onClearLogs }) => {
  const [filterVerdict, setFilterVerdict] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    if (filterVerdict !== 'ALL' && log.verdict !== filterVerdict) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchIp =
        log.rawLog.toLowerCase().includes(term) ||
        log.statusSummary.toLowerCase().includes(term) ||
        log.request.sourceNodeId.toLowerCase().includes(term) ||
        log.request.destNodeId.toLowerCase().includes(term);
      if (!matchIp) return false;
    }
    return true;
  });

  const handleExportLogs = () => {
    const content = logs.map((l) => `[${l.timestamp}] ${l.verdict} -> ${l.rawLog}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ufw-firewall-traffic-logs.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-rose-400" />
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Registro de Eventos y Auditoría de Tráfico (UFW Logs)</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {logs.length} eventos
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspección en tiempo real de paquetes evaluados por las reglas de Firewall y Enrutamiento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogs}
            disabled={logs.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Logs</span>
          </button>
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por IP, puerto, protocolo o servicio..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          {['ALL', 'ALLOWED', 'BLOCKED_BY_UFW', 'REJECTED_BY_UFW'].map((v) => (
            <button
              key={v}
              onClick={() => setFilterVerdict(v)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterVerdict === v
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {v === 'ALL' ? 'Todos' : v.replace('_BY_UFW', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            let badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            let icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;

            if (log.verdict === 'BLOCKED_BY_UFW') {
              badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              icon = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
            } else if (log.verdict === 'REJECTED_BY_UFW') {
              badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
            }

            return (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 text-xs font-mono space-y-1.5 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-bold text-white">
                      {log.request.sourceNodeId} &rarr; {log.request.destNodeId}:{log.request.destPort}
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${badgeClass}`}>
                      {log.verdict}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-sans">
                    <Clock className="w-3.5 h-3.5" />
                    {log.timestamp}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 font-sans">
                  {log.statusSummary}
                </p>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-cyan-300 select-all overflow-x-auto">
                  {log.rawLog}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-950 border border-dashed border-slate-800">
            No hay registros de paquetes con los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
};
