import React from 'react';
import {
  Server,
  Network,
  Radio,
  Route,
  Shield,
  X,
  Play,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { ContainerNode } from '../types';

interface NodeDetailModalProps {
  node: ContainerNode | null;
  onClose: () => void;
  onQuickSimulate: (sourceId: string, destId: string, port: number, proto: 'tcp' | 'udp' | 'icmp', payload: any) => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  onClose,
  onQuickSimulate,
}) => {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {node.name}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Hostname: {node.hostname} &bull; Image: {node.image}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {node.description}
        </p>

        {/* Network Interfaces */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Network className="w-4 h-4 text-cyan-400" />
            <span>Interfaces de Red Virtuales:</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {node.interfaces.map((iface) => (
              <div
                key={iface.name}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300">{iface.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {iface.networkName}
                  </span>
                </div>
                <div className="text-slate-200">
                  <span className="text-slate-500 text-[10px] block">IP / MÁSCARA:</span>
                  <span className="font-bold">{iface.ip}</span> / {iface.subnetMask}
                </div>
                <div className="text-[10px] text-slate-500">
                  MAC: {iface.mac}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open Listening Ports */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Servicios & Puertos en Escucha:</span>
          </h4>

          {node.openPorts.length > 0 ? (
            <div className="space-y-1.5 font-mono text-xs">
              {node.openPorts.map((port) => (
                <div
                  key={port.port}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      :{port.port}/{port.protocol.toUpperCase()}
                    </span>
                    <span className="text-slate-200 font-bold font-sans">
                      {port.service}
                    </span>
                  </div>
                  <span className="text-slate-400 font-sans text-xs">
                    {port.description}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-500">
              No tiene puertos de escucha abiertos (host cliente o de administración).
            </div>
          )}
        </div>

        {/* Routing Table for this node */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Route className="w-4 h-4 text-indigo-400" />
            <span>Tabla de Rutas del Contenedor:</span>
          </h4>

          <div className="space-y-1 font-mono text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800 max-h-28 overflow-y-auto">
            {node.routes.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-slate-300">
                <span>
                  {r.destination === '0.0.0.0' ? 'default (0.0.0.0)' : r.destination} via{' '}
                  <span className="text-cyan-400 font-bold">{r.gateway}</span> dev {r.iface}
                </span>
                <span className="text-[10px] text-slate-500">{r.flags}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
