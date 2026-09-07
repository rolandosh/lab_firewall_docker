/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { NetworkTopology } from './components/NetworkTopology';
import { TrafficSimulator } from './components/TrafficSimulator';
import { GuidedTutorial } from './components/GuidedTutorial';
import { ChallengesView } from './components/ChallengesView';
import { TerminalCLI } from './components/TerminalCLI';
import { FirewallManager } from './components/FirewallManager';
import { PacketLogsViewer } from './components/PacketLogsViewer';
import { DockerFilesExport } from './components/DockerFilesExport';
import { NodeDetailModal } from './components/NodeDetailModal';

import {
  INITIAL_CONTAINER_NODES,
  INITIAL_NETWORK_SEGMENTS,
  DEFAULT_UFW_CONFIG,
} from './data/networkDefaults';
import { CHALLENGES } from './data/challenges';
import { ContainerNode, PacketTestRequest, RouteEntry, SimulationResult, UfwConfig } from './types';
import { simulatePacketTraversal } from './utils/simulationEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('topology');
  const [nodes, setNodes] = useState<ContainerNode[]>(INITIAL_CONTAINER_NODES);
  const [segments] = useState(INITIAL_NETWORK_SEGMENTS);
  const [ufwConfig, setUfwConfig] = useState<UfwConfig>(DEFAULT_UFW_CONFIG);

  const [firewallRoutes, setFirewallRoutes] = useState<RouteEntry[]>(
    INITIAL_CONTAINER_NODES.find((n) => n.role === 'firewall')?.routes || []
  );

  const [activeSimulation, setActiveSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [logs, setLogs] = useState<SimulationResult[]>([]);
  const [completedChallengeIds, setCompletedChallengeIds] = useState<string[]>(['desafio-1']);
  const [inspectedNode, setInspectedNode] = useState<ContainerNode | null>(null);

  const handleRunSimulation = (request: PacketTestRequest) => {
    setIsSimulating(true);

    setTimeout(() => {
      const result = simulatePacketTraversal(request, nodes, segments, ufwConfig);
      setActiveSimulation(result);
      setLogs((prev) => [result, ...prev]);
      setIsSimulating(false);
    }, 500);
  };

  const handleQuickSimulate = (
    sourceId: string,
    destId: string,
    port: number,
    proto: 'tcp' | 'udp' | 'icmp',
    payload: any
  ) => {
    setActiveTab('topology');
    handleRunSimulation({
      sourceNodeId: sourceId,
      destNodeId: destId,
      destPort: port,
      protocol: proto,
      payloadType: payload,
    });
  };

  const handleResetDefaults = () => {
    setNodes(INITIAL_CONTAINER_NODES);
    setUfwConfig(DEFAULT_UFW_CONFIG);
    setFirewallRoutes(INITIAL_CONTAINER_NODES.find((n) => n.role === 'firewall')?.routes || []);
    setActiveSimulation(null);
  };

  const handleChallengeCompleted = (challengeId: string) => {
    if (!completedChallengeIds.includes(challengeId)) {
      setCompletedChallengeIds((prev) => [...prev, challengeId]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ufwConfig={ufwConfig}
        onResetDefaults={handleResetDefaults}
        completedChallengesCount={completedChallengeIds.length}
        totalChallengesCount={CHALLENGES.length}
        logsCount={logs.length}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tab 1: Topología & Simulador */}
        {activeTab === 'topology' && (
          <div className="space-y-6">
            <NetworkTopology
              nodes={nodes}
              segments={segments}
              ufwConfig={ufwConfig}
              activeSimulation={activeSimulation}
              isSimulating={isSimulating}
              onSelectNode={(node) => setInspectedNode(node)}
              onQuickSimulate={handleQuickSimulate}
            />

            <TrafficSimulator
              nodes={nodes}
              ufwConfig={ufwConfig}
              activeSimulation={activeSimulation}
              isSimulating={isSimulating}
              onRunSimulation={handleRunSimulation}
            />
          </div>
        )}

        {/* Tab 2: Guía Paso a Paso */}
        {activeTab === 'guide' && (
          <GuidedTutorial
            onQuickSimulate={handleQuickSimulate}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* Tab 3: Desafíos */}
        {activeTab === 'challenges' && (
          <ChallengesView
            nodes={nodes}
            ufwConfig={ufwConfig}
            completedChallengeIds={completedChallengeIds}
            onChallengeCompleted={handleChallengeCompleted}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* Tab 4: Terminal CLI */}
        {activeTab === 'terminal' && (
          <TerminalCLI
            nodes={nodes}
            ufwConfig={ufwConfig}
            onUpdateUfwConfig={setUfwConfig}
            onUpdateNodes={setNodes}
            onNewLogGenerated={(logText) => {
              // Optionally track custom logs
            }}
          />
        )}

        {/* Tab 5: Reglas & Rutas */}
        {activeTab === 'rules' && (
          <FirewallManager
            ufwConfig={ufwConfig}
            onUpdateUfwConfig={setUfwConfig}
            routes={firewallRoutes}
            onUpdateRoutes={setFirewallRoutes}
          />
        )}

        {/* Tab 6: Logs de Tráfico */}
        {activeTab === 'logs' && (
          <PacketLogsViewer
            logs={logs}
            onClearLogs={() => setLogs([])}
          />
        )}

        {/* Tab 7: Archivos Docker Windows */}
        {activeTab === 'docker-files' && <DockerFilesExport ufwConfig={ufwConfig} />}
      </main>

      {/* Modal for Container Node Inspector */}
      <NodeDetailModal
        node={inspectedNode}
        onClose={() => setInspectedNode(null)}
        onQuickSimulate={handleQuickSimulate}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Laboratorio de Firewall y Enrutamiento &bull; Docker Desktop para Windows, Nginx y Ubuntu UFW
          </span>
          <span className="font-mono text-slate-500">
            WSL 2 &bull; Net-Filter iptables &bull; Zero-Trust
          </span>
        </div>
      </footer>
    </div>
  );
}
