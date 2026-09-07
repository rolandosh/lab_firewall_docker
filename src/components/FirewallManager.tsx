import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Network,
  ArrowRight,
  HelpCircle,
  Route,
  Zap,
} from 'lucide-react';
import { ActionType, DirectionType, Protocol, RouteEntry, UfwConfig, UfwRule } from '../types';

interface FirewallManagerProps {
  ufwConfig: UfwConfig;
  onUpdateUfwConfig: (newConfig: UfwConfig) => void;
  routes: RouteEntry[];
  onUpdateRoutes: (newRoutes: RouteEntry[]) => void;
}

export const FirewallManager: React.FC<FirewallManagerProps> = ({
  ufwConfig,
  onUpdateUfwConfig,
  routes,
  onUpdateRoutes,
}) => {
  const [showAddRuleModal, setShowAddRuleModal] = useState<boolean>(false);
  const [newAction, setNewAction] = useState<ActionType>('ALLOW');
  const [newDirection, setNewDirection] = useState<DirectionType>('ROUTE');
  const [newProtocol, setNewProtocol] = useState<Protocol>('tcp');
  const [newFromIp, setNewFromIp] = useState<string>('172.20.0.10');
  const [newToIp, setNewToIp] = useState<string>('172.30.0.20');
  const [newPort, setNewPort] = useState<string>('8080');
  const [newInInterface, setNewInInterface] = useState<string>('eth0');
  const [newOutInterface, setNewOutInterface] = useState<string>('eth1');
  const [newComment, setNewComment] = useState<string>('');

  const toggleRuleEnabled = (ruleId: string) => {
    const updated = ufwConfig.rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    onUpdateUfwConfig({ ...ufwConfig, rules: updated });
  };

  const deleteRule = (ruleId: string) => {
    const updated = ufwConfig.rules
      .filter((r) => r.id !== ruleId)
      .map((r, idx) => ({ ...r, number: idx + 1 }));
    onUpdateUfwConfig({ ...ufwConfig, rules: updated });
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const rule: UfwRule = {
      id: `rule-${Date.now()}`,
      number: ufwConfig.rules.length + 1,
      action: newAction,
      direction: newDirection,
      protocol: newProtocol,
      fromIp: newFromIp.trim() || 'Anywhere',
      toIp: newToIp.trim() || 'Anywhere',
      toPort: newPort ? parseInt(newPort, 10) : undefined,
      inInterface: newDirection === 'ROUTE' || newDirection === 'IN' ? newInInterface : undefined,
      outInterface: newDirection === 'ROUTE' || newDirection === 'OUT' ? newOutInterface : undefined,
      comment: newComment.trim() || `Regla personalizada ${newAction} port ${newPort}`,
      enabled: true,
      isRouted: newDirection === 'ROUTE',
    };

    onUpdateUfwConfig({
      ...ufwConfig,
      rules: [...ufwConfig.rules, rule],
    });

    setShowAddRuleModal(false);
    setNewComment('');
  };

  return (
    <div className="space-y-6">
      {/* Top Global Firewall Policies Bar */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                ufwConfig.enabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Estado Global de UFW & Kernel Routing
              </h3>
              <p className="text-xs text-slate-400">
                Políticas por defecto para paquetes entrantes, salientes y reenviados (Zero-Trust).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onUpdateUfwConfig({ ...ufwConfig, enabled: !ufwConfig.enabled })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                ufwConfig.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
              }`}
            >
              {ufwConfig.enabled ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>UFW ACTIVO (ufw enable)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>UFW INACTIVO (ufw disable)</span>
                </>
              )}
            </button>

            <button
              onClick={() =>
                onUpdateUfwConfig({
                  ...ufwConfig,
                  ipForwardingEnabled: !ufwConfig.ipForwardingEnabled,
                })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                ufwConfig.ipForwardingEnabled
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>
                ip_forward: {ufwConfig.ipForwardingEnabled ? '1 (ACTIVO)' : '0 (APAGADO)'}
              </span>
            </button>
          </div>
        </div>

        {/* Default Policy Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">
              1. Política Entrante (DEFAULT INPUT):
            </span>
            <div className="flex items-center gap-2">
              <select
                value={ufwConfig.defaultIncoming}
                onChange={(e) =>
                  onUpdateUfwConfig({
                    ...ufwConfig,
                    defaultIncoming: e.target.value as any,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="deny">DENY (Bloquear todo)</option>
                <option value="reject">REJECT (Rechazar con RST)</option>
                <option value="allow">ALLOW (Permitir todo)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">
              2. Reenvío entre Redes (DEFAULT FORWARD):
            </span>
            <div className="flex items-center gap-2">
              <select
                value={ufwConfig.defaultForward}
                onChange={(e) =>
                  onUpdateUfwConfig({
                    ...ufwConfig,
                    defaultForward: e.target.value as any,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="deny">DENY (Zero-Trust Aislado)</option>
                <option value="reject">REJECT (Rechazar tráfico)</option>
                <option value="allow">ALLOW (Paso Libre)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[11px] mb-1">
              3. Política Saliente (DEFAULT OUTPUT):
            </span>
            <div className="flex items-center gap-2">
              <select
                value={ufwConfig.defaultOutgoing}
                onChange={(e) =>
                  onUpdateUfwConfig({
                    ...ufwConfig,
                    defaultOutgoing: e.target.value as any,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="allow">ALLOW (Permitir)</option>
                <option value="deny">DENY (Bloquear)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span>Tabla de Reglas Activas de UFW ({ufwConfig.rules.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Las reglas se evalúan de arriba hacia abajo (First-Match Wins).
            </p>
          </div>

          <button
            onClick={() => setShowAddRuleModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Regla UFW</span>
          </button>
        </div>

        {/* Table layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Acción</th>
                <th className="py-2.5 px-3">Dirección</th>
                <th className="py-2.5 px-3">Origen (From)</th>
                <th className="py-2.5 px-3">Destino (To)</th>
                <th className="py-2.5 px-3">Puerto/Proto</th>
                <th className="py-2.5 px-3">Descripción / Comentario</th>
                <th className="py-2.5 px-3 text-right">Estado / Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {ufwConfig.rules.map((rule) => {
                return (
                  <tr
                    key={rule.id}
                    className={`hover:bg-slate-850 transition-colors ${
                      !rule.enabled ? 'opacity-40 line-through' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-400">
                      [{rule.number}]
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.action === 'ALLOW'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : rule.action === 'REJECT'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {rule.action}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {rule.direction}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-cyan-300 font-semibold">
                      {rule.fromIp}
                      {rule.inInterface && (
                        <span className="text-slate-500 text-[10px] block">
                          on {rule.inInterface}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-emerald-300 font-semibold">
                      {rule.toIp}
                      {rule.outInterface && (
                        <span className="text-slate-500 text-[10px] block">
                          out {rule.outInterface}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-amber-300">
                      {rule.toPort || 'ANY'}/{rule.protocol.toUpperCase()}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans text-xs">
                      {rule.comment || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleRuleEnabled(rule.id)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                          title={rule.enabled ? 'Desactivar regla' : 'Activar regla'}
                        >
                          {rule.enabled ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Eliminar regla"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Routing Table & Kernel Route Map */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800">
          <Route className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-bold text-white">
              Tabla de Enrutamiento del Kernel (Routing Table)
            </h3>
            <p className="text-xs text-slate-400">
              Rutas activas en el Firewall para el reenvío de paquetes entre eth0 (DMZ) y eth1 (Interna).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                <th className="py-2 px-3">Destino</th>
                <th className="py-2 px-3">Gateway</th>
                <th className="py-2 px-3">Máscara (Genmask)</th>
                <th className="py-2 px-3">Flags</th>
                <th className="py-2 px-3">Métrica</th>
                <th className="py-2 px-3">Interfaz</th>
                <th className="py-2 px-3">Propósito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {routes.map((r) => (
                <tr key={r.id} className="hover:bg-slate-850">
                  <td className="py-2.5 px-3 text-cyan-300 font-bold">{r.destination}</td>
                  <td className="py-2.5 px-3 text-slate-400">{r.gateway}</td>
                  <td className="py-2.5 px-3 text-slate-400">{r.genmask}</td>
                  <td className="py-2.5 px-3 text-amber-400">{r.flags}</td>
                  <td className="py-2.5 px-3">{r.metric}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">{r.iface}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-400 text-xs">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Rule */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Nueva Regla de Firewall UFW
              </h3>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Acción:
                  </label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value as ActionType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs cursor-pointer"
                  >
                    <option value="ALLOW">ALLOW (Permitir)</option>
                    <option value="DENY">DENY (Bloquear silencioso)</option>
                    <option value="REJECT">REJECT (Rechazar con RST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dirección:
                  </label>
                  <select
                    value={newDirection}
                    onChange={(e) => setNewDirection(e.target.value as DirectionType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs cursor-pointer"
                  >
                    <option value="ROUTE">ROUTE (Entre subredes)</option>
                    <option value="IN">IN (Hacia el Firewall)</option>
                    <option value="OUT">OUT (Desde el Firewall)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    IP / Subred Origen:
                  </label>
                  <input
                    type="text"
                    value={newFromIp}
                    onChange={(e) => setNewFromIp(e.target.value)}
                    placeholder="Ej: Anywhere o 172.20.0.10"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    IP / Subred Destino:
                  </label>
                  <input
                    type="text"
                    value={newToIp}
                    onChange={(e) => setNewToIp(e.target.value)}
                    placeholder="Ej: 172.30.0.20 o Anywhere"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Puerto Destino:
                  </label>
                  <input
                    type="number"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    placeholder="Ej: 80, 8080, 22"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Protocolo:
                  </label>
                  <select
                    value={newProtocol}
                    onChange={(e) => setNewProtocol(e.target.value as Protocol)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs cursor-pointer"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                    <option value="any">Cualquiera (ANY)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Comentario / Motivo de Seguridad:
                </label>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ej: Permitir acceso a la API REST de clientes autorizados"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer"
                >
                  Guardar Regla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
