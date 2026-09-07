import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Globe,
  Database,
  Laptop,
  Terminal,
  ArrowRight,
  Sparkles,
  Info,
  Server,
  Zap,
} from 'lucide-react';
import { ContainerNode, NetworkSegment, SimulationResult, UfwConfig } from '../types';

interface NetworkTopologyProps {
  nodes: ContainerNode[];
  segments: NetworkSegment[];
  ufwConfig: UfwConfig;
  activeSimulation: SimulationResult | null;
  isSimulating: boolean;
  onSelectNode: (node: ContainerNode) => void;
  onQuickSimulate: (sourceId: string, destId: string, port: number, proto: 'tcp' | 'udp' | 'icmp', payload: any) => void;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({
  nodes,
  segments,
  ufwConfig,
  activeSimulation,
  isSimulating,
  onSelectNode,
  onQuickSimulate,
}) => {
  const getNodeIcon = (role: string) => {
    switch (role) {
      case 'firewall':
        return <ShieldAlert className="w-6 h-6 text-amber-400" />;
      case 'web-dmz':
        return <Globe className="w-6 h-6 text-cyan-400" />;
      case 'internal-api':
        return <Database className="w-6 h-6 text-emerald-400" />;
      case 'client-external':
        return <Laptop className="w-6 h-6 text-blue-400" />;
      case 'admin-client':
        return <Terminal className="w-6 h-6 text-purple-400" />;
      default:
        return <Server className="w-6 h-6 text-slate-400" />;
    }
  };

  const dmzNodes = nodes.filter((n) => n.interfaces.some((i) => i.networkName === 'red_dmz') && n.role !== 'firewall');
  const internalNodes = nodes.filter((n) => n.interfaces.some((i) => i.networkName === 'red_interna') && n.role !== 'firewall');
  const firewallNode = nodes.find((n) => n.role === 'firewall');

  const sourceNode = activeSimulation ? nodes.find((n) => n.id === activeSimulation.request.sourceNodeId) : null;
  const destNode = activeSimulation ? nodes.find((n) => n.id === activeSimulation.request.destNodeId) : null;

  return (
    <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-6 overflow-hidden shadow-xl">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* Header Info */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              Diagrama de Red Segmentada & Enrutamiento
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              2 Redes Bridge Aisladas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Haz clic en cualquier contenedor para ver su tabla de rutas, IPs y puertos abiertos.
          </p>
        </div>

        {/* Quick legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-3 h-1.5 rounded-full bg-cyan-400" />
            <span>DMZ (172.20.0.0/24)</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-3 h-1.5 rounded-full bg-emerald-400" />
            <span>Interna (172.30.0.0/24)</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-3 h-1.5 rounded-full bg-amber-400" />
            <span>Gateway / UFW</span>
          </div>
        </div>
      </div>

      {/* Main Architecture Visual Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative">
        {/* Left: DMZ Subnet Box */}
        <div className="lg:col-span-4 rounded-xl border border-cyan-500/30 bg-cyan-950/15 p-4 flex flex-col justify-between relative group hover:border-cyan-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="font-bold text-sm text-cyan-300">dmz_net (Red DMZ)</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              172.20.0.0/24
            </span>
          </div>

          <div className="space-y-3">
            {dmzNodes.map((node) => {
              const isSource = sourceNode?.id === node.id;
              const isDest = destNode?.id === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className={`cursor-pointer rounded-xl p-3 border transition-all duration-200 ${
                    isSource
                      ? 'bg-blue-900/40 border-blue-400 shadow-md ring-2 ring-blue-500/30'
                      : isDest
                      ? 'bg-cyan-900/40 border-cyan-400 shadow-md ring-2 ring-cyan-500/30'
                      : 'bg-slate-900/90 border-slate-700/80 hover:border-cyan-400/60 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                        {getNodeIcon(node.role)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                          {node.name}
                          {isSource && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-200 border border-blue-400/40">
                              ORIGEN
                            </span>
                          )}
                          {isDest && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400/40">
                              DESTINO
                            </span>
                          )}
                        </h4>
                        <p className="text-xs font-mono text-cyan-400">
                          {node.interfaces[0]?.ip}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      eth0
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>Puertos:</span>
                      {node.openPorts.length > 0 ? (
                        node.openPorts.map((p) => (
                          <span
                            key={p.port}
                            className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          >
                            :{p.port}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 text-[11px]">Ninguno</span>
                      )}
                    </div>
                    <span className="text-[11px] text-cyan-400/80 hover:text-cyan-300 flex items-center gap-0.5">
                      Detalles <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-cyan-500/20">
            <span>Gateway interfaz:</span>
            <span className="font-mono text-cyan-300 font-semibold">172.20.0.254 (Firewall)</span>
          </div>
        </div>

        {/* Center: Firewall / Router Container */}
        <div className="lg:col-span-4 flex flex-col justify-center">
          {firewallNode && (
            <div
              onClick={() => onSelectNode(firewallNode)}
              className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative ${
                ufwConfig.enabled
                  ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/20 border-amber-500/50 shadow-xl'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              {/* Top Banner */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {firewallNode.name}
                    </h3>
                    <p className="text-[11px] text-amber-300/80 font-mono">
                      Router Dual-Homed (Ubuntu 22.04)
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    ufwConfig.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  UFW {ufwConfig.enabled ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>

              {/* Dual Interfaces Badge Display */}
              <div className="grid grid-cols-2 gap-2 my-3">
                <div className="rounded-lg p-2 bg-cyan-950/30 border border-cyan-500/40 text-left">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    Interfaz eth0 (DMZ)
                  </div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    172.20.0.254
                  </div>
                  <div className="text-[10px] text-slate-400">Red 172.20.0.0/24</div>
                </div>

                <div className="rounded-lg p-2 bg-emerald-950/30 border border-emerald-500/40 text-left">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Interfaz eth1 (Interna)
                  </div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    172.30.0.254
                  </div>
                  <div className="text-[10px] text-slate-400">Red 172.30.0.0/24</div>
                </div>
              </div>

              {/* Core Engine Statuses */}
              <div className="space-y-1.5 text-xs bg-slate-950/60 rounded-xl p-3 border border-slate-800 font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">sysctl ip_forward:</span>
                  <span
                    className={`font-bold ${
                      ufwConfig.ipForwardingEnabled ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {ufwConfig.ipForwardingEnabled ? '1 (Habilitado)' : '0 (Deshabilitado)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Default Forward:</span>
                  <span className="font-bold text-amber-400 uppercase">
                    {ufwConfig.defaultForward}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Reglas Activas:</span>
                  <span className="font-bold text-cyan-400">
                    {ufwConfig.rules.filter((r) => r.enabled).length} reglas
                  </span>
                </div>
              </div>

              {/* Simulation animation overlay if active */}
              {isSimulating && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs rounded-2xl flex items-center justify-center p-4 z-10 border border-cyan-500 animate-pulse">
                  <div className="text-center">
                    <Zap className="w-8 h-8 text-cyan-400 mx-auto animate-bounce" />
                    <p className="text-xs font-bold text-cyan-300 mt-2 font-mono">
                      Inspeccionando Paquetes en Firewall...
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-3 text-center">
                <span className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center justify-center gap-1 font-medium">
                  <Info className="w-3.5 h-3.5" />
                  Clic para inspeccionar reglas y tabla de rutas
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Internal Subnet Box */}
        <div className="lg:col-span-4 rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4 flex flex-col justify-between relative group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="font-bold text-sm text-emerald-300">internal_net (Red Interna)</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              172.30.0.0/24
            </span>
          </div>

          <div className="space-y-3">
            {internalNodes.map((node) => {
              const isSource = sourceNode?.id === node.id;
              const isDest = destNode?.id === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className={`cursor-pointer rounded-xl p-3 border transition-all duration-200 ${
                    isSource
                      ? 'bg-blue-900/40 border-blue-400 shadow-md ring-2 ring-blue-500/30'
                      : isDest
                      ? 'bg-emerald-900/40 border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-slate-900/90 border-slate-700/80 hover:border-emerald-400/60 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                        {getNodeIcon(node.role)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                          {node.name}
                          {isSource && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-200 border border-blue-400/40">
                              ORIGEN
                            </span>
                          )}
                          {isDest && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                              DESTINO
                            </span>
                          )}
                        </h4>
                        <p className="text-xs font-mono text-emerald-400">
                          {node.interfaces[0]?.ip}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      eth0
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>Puertos:</span>
                      {node.openPorts.length > 0 ? (
                        node.openPorts.map((p) => (
                          <span
                            key={p.port}
                            className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          >
                            :{p.port}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 text-[11px]">Ninguno</span>
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-400/80 hover:text-emerald-300 flex items-center gap-0.5">
                      Detalles <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-emerald-500/20">
            <span>Gateway interfaz:</span>
            <span className="font-mono text-emerald-300 font-semibold">172.30.0.254 (Firewall)</span>
          </div>
        </div>
      </div>

      {/* Quick Test Bar at the bottom of the topology */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Pruebas Rápidas de Tráfico:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onQuickSimulate('cliente_externo', 'nginx_dmz', 80, 'tcp', 'HTTP GET')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Cliente &rarr; Nginx DMZ (:80)</span>
          </button>

          <button
            onClick={() => onQuickSimulate('cliente_externo', 'nginx_internal', 8080, 'tcp', 'HTTP GET')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Cliente &rarr; API Interna (:8080)</span>
          </button>

          <button
            onClick={() => onQuickSimulate('nginx_dmz', 'nginx_internal', 8080, 'tcp', 'HTTP GET')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>DMZ &rarr; API Interna (:8080)</span>
          </button>

          <button
            onClick={() => onQuickSimulate('admin_pc', 'ubuntu_firewall', 22, 'tcp', 'SSH Connect')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Admin &rarr; Firewall SSH (:22)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
