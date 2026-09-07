import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Network,
  Shield,
  Layers,
  FileText,
  Clock,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { ContainerNode, PacketTestRequest, Protocol, SimulationResult, UfwConfig } from '../types';

interface TrafficSimulatorProps {
  nodes: ContainerNode[];
  ufwConfig: UfwConfig;
  activeSimulation: SimulationResult | null;
  isSimulating: boolean;
  onRunSimulation: (request: PacketTestRequest) => void;
}

export const TrafficSimulator: React.FC<TrafficSimulatorProps> = ({
  nodes,
  ufwConfig,
  activeSimulation,
  isSimulating,
  onRunSimulation,
}) => {
  const [sourceId, setSourceId] = useState<string>('cliente_externo');
  const [destId, setDestId] = useState<string>('nginx_dmz');
  const [protocol, setProtocol] = useState<Protocol>('tcp');
  const [destPort, setDestPort] = useState<number>(80);
  const [payloadType, setPayloadType] = useState<PacketTestRequest['payloadType']>('HTTP GET');
  const [customPayload, setCustomPayload] = useState<string>('');

  const handlePresetSelect = (preset: {
    source: string;
    dest: string;
    proto: Protocol;
    port: number;
    payload: PacketTestRequest['payloadType'];
  }) => {
    setSourceId(preset.source);
    setDestId(preset.dest);
    setProtocol(preset.proto);
    setDestPort(preset.port);
    setPayloadType(preset.payload);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunSimulation({
      sourceNodeId: sourceId,
      destNodeId: destId,
      protocol,
      destPort: Number(destPort),
      payloadType,
      customPayload,
    });
  };

  const getVerdictBadge = (verdict: SimulationResult['verdict']) => {
    switch (verdict) {
      case 'ALLOWED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>PERMITIDO (HTTP 200 / PASS)</span>
          </div>
        );
      case 'BLOCKED_BY_UFW':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>BLOQUEADO POR FIREWALL (DROP)</span>
          </div>
        );
      case 'REJECTED_BY_UFW':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>RECHAZADO POR UFW (TCP RST / REJECT)</span>
          </div>
        );
      case 'IP_FORWARD_DISABLED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>IP FORWARDING DESACTIVADO</span>
          </div>
        );
      case 'PORT_CLOSED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            <span>PUERTO CERRADO EN DESTINO</span>
          </div>
        );
      default:
        return null;
    }
  };

  const sourceNode = nodes.find((n) => n.id === sourceId);
  const destNode = nodes.find((n) => n.id === destId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Packet Builder Form */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm sm:text-base text-white">
                Generador de Paquetes de Red
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Inyector de Tráfico
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            {/* Source Node Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                1. Contenedor de Origen (Source Host):
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs cursor-pointer"
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name} &bull; {node.interfaces[0]?.ip} ({node.interfaces[0]?.networkName})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Node Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                2. Contenedor de Destino (Destination Host):
              </label>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs cursor-pointer"
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name} &bull; {node.interfaces[0]?.ip} ({node.interfaces[0]?.networkName})
                  </option>
                ))}
              </select>
            </div>

            {/* Protocol & Port Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  3. Protocolo:
                </label>
                <select
                  value={protocol}
                  onChange={(e) => {
                    const proto = e.target.value as Protocol;
                    setProtocol(proto);
                    if (proto === 'icmp') {
                      setPayloadType('PING (ICMP)');
                      setDestPort(0);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs cursor-pointer"
                >
                  <option value="tcp">TCP (Confiable)</option>
                  <option value="udp">UDP (Datagrama)</option>
                  <option value="icmp">ICMP (Ping)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  4. Puerto Destino:
                </label>
                <input
                  type="number"
                  disabled={protocol === 'icmp'}
                  value={destPort}
                  onChange={(e) => setDestPort(Number(e.target.value))}
                  placeholder="Ej: 80, 8080, 22, 3306"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs disabled:opacity-50"
                />
              </div>
            </div>

            {/* Payload Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                5. Tipo de Petición / Payload:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['HTTP GET', 'PING (ICMP)', 'SSH Connect', 'MySQL Query', 'Custom Probe'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setPayloadType(type);
                      if (type === 'HTTP GET') setDestPort(destId === 'nginx_dmz' ? 80 : 8080);
                      if (type === 'PING (ICMP)') {
                        setProtocol('icmp');
                        setDestPort(0);
                      }
                      if (type === 'SSH Connect') {
                        setProtocol('tcp');
                        setDestPort(22);
                      }
                      if (type === 'MySQL Query') {
                        setProtocol('tcp');
                        setDestPort(3306);
                      }
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                      payloadType === type
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{isSimulating ? 'Inspeccionando Paquete...' : 'Enviar Paquete y Analizar'}</span>
            </button>
          </form>
        </div>

        {/* Popular test presets */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4">
          <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Casos de Prueba Didácticos:
          </h4>
          <div className="space-y-1.5">
            <button
              onClick={() =>
                handlePresetSelect({
                  source: 'cliente_externo',
                  dest: 'nginx_dmz',
                  proto: 'tcp',
                  port: 80,
                  payload: 'HTTP GET',
                })
              }
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-850 text-xs text-slate-300 hover:text-cyan-300 border border-slate-800 flex items-center justify-between group transition-all"
            >
              <span>1. Cliente &rarr; Web DMZ (:80)</span>
              <span className="text-[10px] text-emerald-400 font-mono group-hover:underline">Permitido</span>
            </button>

            <button
              onClick={() =>
                handlePresetSelect({
                  source: 'cliente_externo',
                  dest: 'nginx_internal',
                  proto: 'tcp',
                  port: 8080,
                  payload: 'HTTP GET',
                })
              }
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-850 text-xs text-slate-300 hover:text-rose-300 border border-slate-800 flex items-center justify-between group transition-all"
            >
              <span>2. Cliente &rarr; API Interna (:8080)</span>
              <span className="text-[10px] text-rose-400 font-mono group-hover:underline">Bloqueado UFW</span>
            </button>

            <button
              onClick={() =>
                handlePresetSelect({
                  source: 'nginx_dmz',
                  dest: 'nginx_internal',
                  proto: 'tcp',
                  port: 8080,
                  payload: 'HTTP GET',
                })
              }
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-850 text-xs text-slate-300 hover:text-emerald-300 border border-slate-800 flex items-center justify-between group transition-all"
            >
              <span>3. DMZ Frontend &rarr; API Interna (:8080)</span>
              <span className="text-[10px] text-emerald-400 font-mono group-hover:underline">Permitido DMZ</span>
            </button>

            <button
              onClick={() =>
                handlePresetSelect({
                  source: 'nginx_dmz',
                  dest: 'nginx_internal',
                  proto: 'tcp',
                  port: 3306,
                  payload: 'MySQL Query',
                })
              }
              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-850 text-xs text-slate-300 hover:text-rose-300 border border-slate-800 flex items-center justify-between group transition-all"
            >
              <span>4. DMZ &rarr; MySQL Interno (:3306)</span>
              <span className="text-[10px] text-rose-400 font-mono group-hover:underline">Bloqueado (Lateral)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Step-by-Step Packet Inspection Result */}
      <div className="lg:col-span-7 space-y-4">
        {activeSimulation ? (
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-lg space-y-4">
            {/* Verdict Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Resultado de la Inspección de Paquete
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    ({activeSimulation.durationMs}ms)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeSimulation.statusSummary}
                </p>
              </div>

              <div>{getVerdictBadge(activeSimulation.verdict)}</div>
            </div>

            {/* Packet Header Snapshot Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">SRC IP:</span>
                <span className="text-cyan-400 font-bold">
                  {sourceNode?.interfaces[0]?.ip}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">DST IP:</span>
                <span className="text-emerald-400 font-bold">
                  {destNode?.interfaces[0]?.ip}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">PROTO/PORT:</span>
                <span className="text-amber-400 font-bold">
                  {activeSimulation.request.protocol.toUpperCase()}/{activeSimulation.request.destPort || 'ICMP'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">PAYLOAD:</span>
                <span className="text-slate-300 font-bold truncate block">
                  {activeSimulation.request.payloadType}
                </span>
              </div>
            </div>

            {/* Chronological Hops Trail */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                Ruta del Paquete paso a paso (Hop-by-Hop Trace):
              </h4>

              <div className="space-y-2.5">
                {activeSimulation.hops.map((hop, idx) => {
                  let statusBg = 'bg-slate-950 border-slate-800';
                  let icon = <Clock className="w-4 h-4 text-slate-400" />;

                  if (hop.status === 'pass') {
                    statusBg = 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300';
                    icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
                  } else if (hop.status === 'drop') {
                    statusBg = 'bg-rose-950/20 border-rose-500/30 text-rose-300';
                    icon = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
                  } else if (hop.status === 'reject') {
                    statusBg = 'bg-amber-950/20 border-amber-500/30 text-amber-300';
                    icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border ${statusBg} text-xs transition-all`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">{icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white text-xs">
                              Paso {idx + 1}: {hop.nodeName} ({hop.action})
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {hop.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 mt-1 font-medium">
                            {hop.description}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {hop.detail}
                          </p>

                          {hop.ruleMatched && (
                            <div className="mt-2 p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-[11px] font-mono">
                              <span className="text-amber-400 font-bold">
                                Regla UFW #{hop.ruleMatched.number}:{' '}
                              </span>
                              <span className="text-slate-300">
                                {hop.ruleMatched.action} de {hop.ruleMatched.fromIp} a {hop.ruleMatched.toIp}:{hop.ruleMatched.toPort || 'ANY'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Raw Wireshark / Kernel Log Output */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  Registro en /var/log/ufw.log (Simulado):
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 select-all overflow-x-auto">
                {activeSimulation.rawLog}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[300px] rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 mb-3">
              <Network className="w-8 h-8 text-cyan-400/60" />
            </div>
            <h4 className="font-bold text-sm text-slate-300">
              Ninguna prueba ejecutada aún
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Selecciona un origen, destino y puerto en el generador de paquetes y pulsa &quot;Enviar Paquete&quot; para inspeccionar el flujo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
