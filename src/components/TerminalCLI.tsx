import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  HelpCircle,
  Copy,
  Check,
  Server,
  Zap,
} from 'lucide-react';
import { ContainerNode, TerminalHistoryItem, UfwConfig, UfwRule } from '../types';
import { simulatePacketTraversal } from '../utils/simulationEngine';

interface TerminalCLIProps {
  nodes: ContainerNode[];
  ufwConfig: UfwConfig;
  onUpdateUfwConfig: (newConfig: UfwConfig) => void;
  onUpdateNodes: (newNodes: ContainerNode[]) => void;
  onNewLogGenerated?: (logText: string) => void;
}

export const TerminalCLI: React.FC<TerminalCLIProps> = ({
  nodes,
  ufwConfig,
  onUpdateUfwConfig,
  onUpdateNodes,
  onNewLogGenerated,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('ubuntu_firewall');
  const [inputVal, setInputVal] = useState<string>('');
  const [history, setHistory] = useState<TerminalHistoryItem[]>([
    {
      id: 'init-1',
      nodeId: 'ubuntu_firewall',
      command: 'ufw status verbose',
      output: `Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), deny (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
172.20.0.10 80/tcp (routed) ALLOW IN   Anywhere on eth0
172.30.0.20 8080/tcp (routed) ALLOW IN 172.20.0.10 on eth0
22/tcp                     ALLOW IN    172.30.0.30
172.30.0.0/24 3306/tcp (routed) DENY IN 172.20.0.0/24 on eth0`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [commandHistory, setCommandHistory] = useState<string[]>(['ufw status verbose']);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[2];

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const executeCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    // Add to up/down history
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);

    if (cmd === 'clear') {
      setHistory([]);
      setInputVal('');
      return;
    }

    let output = '';
    let isError = false;
    const lower = cmd.toLowerCase();

    // Context: Ubuntu Firewall Container Commands
    if (selectedNode.role === 'firewall') {
      if (lower === 'help') {
        output = `Comandos de Firewall y Red disponibles:
  - ufw status | ufw status verbose | ufw status numbered
  - ufw enable | ufw disable | ufw reset
  - ufw default deny incoming | ufw default allow outgoing | ufw default deny forward
  - ufw allow <port>/<proto> (ej. ufw allow 80/tcp)
  - ufw deny <port>/<proto> (ej. ufw deny 3306/tcp)
  - ufw route allow in on eth0 to <ip> port <port> proto tcp
  - ufw route deny in on eth0 to <ip> port <port> proto tcp
  - ufw delete <numero_de_regla>
  - sysctl net.ipv4.ip_forward | sysctl -w net.ipv4.ip_forward=1
  - ip route show | route -n | ip addr
  - iptables -L -n -v
  - cat /etc/default/ufw | cat /var/log/ufw.log
  - clear`;
      } else if (lower === 'ufw status' || lower === 'ufw status verbose') {
        if (!ufwConfig.enabled) {
          output = 'Status: inactive';
        } else {
          output = `Status: active
Logging: on (low)
Default: ${ufwConfig.defaultIncoming} (incoming), ${ufwConfig.defaultOutgoing} (outgoing), ${ufwConfig.defaultForward} (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
${ufwConfig.rules
  .filter((r) => r.enabled)
  .map(
    (r) =>
      `${(r.toIp === 'Anywhere' ? '' : r.toIp + ' ') + (r.toPort ? r.toPort + '/' + r.protocol : r.protocol) + (r.direction === 'ROUTE' ? ' (routed)' : '')}`.padEnd(27) +
      `${r.action} IN`.padEnd(12) +
      `${r.fromIp}${r.inInterface ? ' on ' + r.inInterface : ''}`
  )
  .join('\n')}`;
        }
      } else if (lower === 'ufw status numbered') {
        if (!ufwConfig.enabled) {
          output = 'Status: inactive';
        } else {
          output = `Status: active

     To                         Action      From
     --                         ------      ----
${ufwConfig.rules
  .map(
    (r, idx) =>
      `[${idx + 1}]  ` +
      `${(r.toIp === 'Anywhere' ? '' : r.toIp + ' ') + (r.toPort ? r.toPort + '/' + r.protocol : r.protocol) + (r.direction === 'ROUTE' ? ' (routed)' : '')}`.padEnd(27) +
      `${r.action} IN`.padEnd(12) +
      `${r.fromIp}${r.inInterface ? ' on ' + r.inInterface : ''}`
  )
  .join('\n')}`;
        }
      } else if (lower === 'ufw enable' || lower === 'ufw --force enable') {
        onUpdateUfwConfig({ ...ufwConfig, enabled: true });
        output = 'Firewall is active and enabled on system startup';
      } else if (lower === 'ufw disable') {
        onUpdateUfwConfig({ ...ufwConfig, enabled: false });
        output = 'Firewall stopped and disabled on system startup';
      } else if (lower === 'ufw reset' || lower === 'ufw --force reset') {
        onUpdateUfwConfig({
          ...ufwConfig,
          enabled: false,
          rules: [],
        });
        output = 'Resetting all rules to installed defaults. Proceeding with operation...\nFirewall stopped and disabled on system startup';
      } else if (lower.startsWith('ufw default')) {
        const parts = cmd.split(' ');
        const action = parts[2]?.toLowerCase();
        const dir = parts[3]?.toLowerCase();

        if ((action === 'deny' || action === 'allow' || action === 'reject') && dir) {
          if (dir === 'incoming') {
            onUpdateUfwConfig({ ...ufwConfig, defaultIncoming: action });
            output = `Default incoming policy changed to '${action}'\n(be sure to update your rules accordingly)`;
          } else if (dir === 'outgoing') {
            onUpdateUfwConfig({ ...ufwConfig, defaultOutgoing: action === 'deny' ? 'deny' : 'allow' });
            output = `Default outgoing policy changed to '${action}'`;
          } else if (dir === 'forward' || dir === 'routed') {
            onUpdateUfwConfig({ ...ufwConfig, defaultForward: action });
            output = `Default forward policy changed to '${action}'\n(be sure to update your rules accordingly)`;
          } else {
            output = `Invalid direction '${dir}'. Use incoming, outgoing, or forward.`;
            isError = true;
          }
        } else {
          output = 'Usage: ufw default allow|deny|reject incoming|outgoing|forward';
          isError = true;
        }
      } else if (lower.startsWith('ufw delete')) {
        const numStr = cmd.replace('ufw delete', '').trim();
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num >= 1 && num <= ufwConfig.rules.length) {
          const newRules = ufwConfig.rules.filter((_, idx) => idx + 1 !== num);
          // Renumber
          const renumbered = newRules.map((r, i) => ({ ...r, number: i + 1 }));
          onUpdateUfwConfig({ ...ufwConfig, rules: renumbered });
          output = `Deleting [${num}]...\nRule deleted (v4)`;
        } else {
          output = `Error: Could not find rule number '${numStr}'. Use 'ufw status numbered' to check numbers.`;
          isError = true;
        }
      } else if (lower.startsWith('ufw route allow') || lower.startsWith('ufw route deny') || lower.startsWith('ufw allow') || lower.startsWith('ufw deny')) {
        // Parse custom rule
        const isRoute = lower.includes('route');
        const isAllow = lower.includes('allow');
        const action = isAllow ? 'ALLOW' : 'DENY';

        // Extract port
        const portMatch = cmd.match(/port\s+(\d+)/i) || cmd.match(/(\d+)\/(tcp|udp)/i) || cmd.match(/(\d+)/);
        const port = portMatch ? parseInt(portMatch[1], 10) : 80;

        // Extract IPs
        const fromMatch = cmd.match(/from\s+([0-9./a-zA-Z]+)/i);
        const toMatch = cmd.match(/to\s+([0-9./a-zA-Z]+)/i);

        const fromIp = fromMatch ? fromMatch[1] : 'Anywhere';
        const toIp = toMatch ? toMatch[1] : 'Anywhere';

        const newRule: UfwRule = {
          id: `rule-${Date.now()}`,
          number: ufwConfig.rules.length + 1,
          action: action as any,
          direction: isRoute ? 'ROUTE' : 'IN',
          protocol: lower.includes('udp') ? 'udp' : 'tcp',
          fromIp,
          toIp,
          toPort: port,
          comment: `Regla agregada por consola: ${cmd}`,
          enabled: true,
          isRouted: isRoute,
        };

        onUpdateUfwConfig({
          ...ufwConfig,
          rules: [...ufwConfig.rules, newRule],
        });

        output = `Rule ${isRoute ? 'routed' : 'added'}\nRule ${isRoute ? 'routed' : 'added'} (v4)`;
      } else if (lower.startsWith('sysctl')) {
        if (lower.includes('net.ipv4.ip_forward=1') || lower.includes('net.ipv4.ip_forward = 1')) {
          onUpdateUfwConfig({ ...ufwConfig, ipForwardingEnabled: true });
          output = 'net.ipv4.ip_forward = 1';
        } else if (lower.includes('net.ipv4.ip_forward=0') || lower.includes('net.ipv4.ip_forward = 0')) {
          onUpdateUfwConfig({ ...ufwConfig, ipForwardingEnabled: false });
          output = 'net.ipv4.ip_forward = 0';
        } else {
          output = `net.ipv4.ip_forward = ${ufwConfig.ipForwardingEnabled ? 1 : 0}`;
        }
      } else if (lower === 'ip route' || lower === 'ip route show' || lower === 'route -n') {
        output = `Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
172.20.0.0      0.0.0.0         255.255.255.0   U     0      0        0 eth0
172.30.0.0      0.0.0.0         255.255.255.0   U     0      0        0 eth1`;
      } else if (lower === 'ip addr' || lower === 'ip a' || lower === 'ifconfig') {
        output = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
2: eth0@if12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    inet 172.20.0.254/24 brd 172.20.0.255 scope global eth0
3: eth1@if14: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    inet 172.30.0.254/24 brd 172.30.0.255 scope global eth1`;
      } else if (lower.startsWith('iptables')) {
        output = `Chain INPUT (policy ${ufwConfig.defaultIncoming.toUpperCase()} 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 ufw-before-logging-input  all  --  *      *       0.0.0.0/0            0.0.0.0/0           

Chain FORWARD (policy ${ufwConfig.defaultForward.toUpperCase()} 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 ufw-before-logging-forward  all  --  *      *       0.0.0.0/0            0.0.0.0/0           

Chain OUTPUT (policy ${ufwConfig.defaultOutgoing.toUpperCase()} 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination`;
      } else if (lower.startsWith('cat /etc/default/ufw')) {
        output = `# /etc/default/ufw
IPV6=no
DEFAULT_INPUT_POLICY="${ufwConfig.defaultIncoming.toUpperCase()}"
DEFAULT_OUTPUT_POLICY="${ufwConfig.defaultOutgoing.toUpperCase()}"
DEFAULT_FORWARD_POLICY="${ufwConfig.defaultForward.toUpperCase()}"
DEFAULT_APPLICATION_POLICY="SKIP"
MANAGE_BUILTINS="no"
IPT_SYSCTL="/etc/ufw/sysctl.conf"`;
      } else if (lower.startsWith('cat /var/log/ufw.log')) {
        output = `[2026-09-03 08:35:10] [UFW BLOCK] IN=eth0 OUT=eth1 MAC=02:42:ac:14:00:fe SRC=172.20.0.50 DST=172.30.0.20 PROTO=TCP SPT=49152 DPT=8080 SYN
[2026-09-03 08:35:14] [UFW ALLOW] IN=eth0 OUT=eth0 MAC=02:42:ac:14:00:0a SRC=172.20.0.50 DST=172.20.0.10 PROTO=TCP SPT=51200 DPT=80 SYN
[2026-09-03 08:35:22] [UFW BLOCK] IN=eth0 OUT=eth1 MAC=02:42:ac:14:00:fe SRC=172.20.0.10 DST=172.30.0.20 PROTO=TCP SPT=33890 DPT=3306 SYN`;
      } else {
        output = `bash: ${cmd.split(' ')[0]}: comando simulado no encontrado. Escribe 'help' para ver los comandos válidos.`;
        isError = true;
      }
    } else {
      // Context: Client, DMZ or Internal container
      if (lower === 'help') {
        output = `Comandos de diagnóstico y cliente disponibles:
  - curl -I http://172.20.0.10 (Probar Web DMZ puerto 80)
  - curl http://172.30.0.20:8080 (Probar API Interna)
  - ping -c 3 172.20.0.10 | ping -c 3 172.30.0.20
  - ip addr | ip route show
  - clear`;
      } else if (lower.startsWith('curl')) {
        // Trigger live simulation engine!
        const isInternalApi = cmd.includes('172.30.0.20') || cmd.includes('8080');
        const isDmzWeb = cmd.includes('172.20.0.10') || cmd.includes(':80');
        const isPort3306 = cmd.includes('3306');

        const targetNodeId = isInternalApi || isPort3306 ? 'nginx_internal' : 'nginx_dmz';
        const port = isPort3306 ? 3306 : isInternalApi ? 8080 : 80;

        const sim = simulatePacketTraversal(
          {
            sourceNodeId: selectedNode.id,
            destNodeId: targetNodeId,
            protocol: 'tcp',
            destPort: port,
            payloadType: 'HTTP GET',
          },
          nodes,
          [],
          ufwConfig
        );

        if (onNewLogGenerated) {
          onNewLogGenerated(sim.rawLog);
        }

        if (sim.verdict === 'ALLOWED') {
          output =
            port === 80
              ? `HTTP/1.1 200 OK
Server: nginx/1.25.4
Date: ${new Date().toUTCString()}
Content-Type: text/html
Content-Length: 612
Connection: keep-alive

<!DOCTYPE html>
<html><head><title>Portal Web Corporativo (DMZ)</title></head><body>...</body></html>`
              : `HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 148

{
  "status": "success",
  "zone": "INTERNAL_SECURE_NETWORK",
  "ip": "172.30.0.20:8080",
  "message": "Bienvenido a la API de datos interna."
}`;
        } else if (sim.verdict === 'BLOCKED_BY_UFW') {
          output = `curl: (28) Failed to connect to ${isInternalApi ? '172.30.0.20' : '172.20.0.10'} port ${port}: Connection timed out (Firewall DROP)`;
          isError = true;
        } else if (sim.verdict === 'REJECTED_BY_UFW') {
          output = `curl: (7) Failed to connect to ${isInternalApi ? '172.30.0.20' : '172.20.0.10'} port ${port}: Connection refused (TCP RST by Firewall)`;
          isError = true;
        } else {
          output = `curl: Error de conexión (${sim.statusSummary})`;
          isError = true;
        }
      } else if (lower.startsWith('ping')) {
        output = `PING 172.30.0.20 (172.30.0.20) 56(84) bytes of data.
64 bytes from 172.30.0.20: icmp_seq=1 ttl=63 time=0.412 ms
64 bytes from 172.30.0.20: icmp_seq=2 ttl=63 time=0.389 ms
64 bytes from 172.30.0.20: icmp_seq=3 ttl=63 time=0.401 ms

--- 172.30.0.20 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2048ms
rtt min/avg/max/mdev = 0.389/0.400/0.412/0.010 ms`;
      } else if (lower === 'ip route' || lower === 'ip route show' || lower === 'route -n') {
        output = `default via ${selectedNode.routes.find((r) => r.destination === '0.0.0.0')?.gateway || '172.20.0.254'} dev eth0 proto static 
${selectedNode.interfaces[0]?.ip.split('.').slice(0, 3).join('.')}.0/24 dev eth0 proto kernel scope link src ${selectedNode.interfaces[0]?.ip}`;
      } else if (lower === 'ip addr' || lower === 'ip a') {
        output = `1: eth0@if18: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet ${selectedNode.interfaces[0]?.ip}/24 scope global eth0`;
      } else {
        output = `sh: ${cmd.split(' ')[0]}: comando no reconocido. Usa 'help', 'curl' o 'ip route'.`;
        isError = true;
      }
    }

    setHistory((prev) => [
      ...prev,
      {
        id: `cmd-${Date.now()}`,
        nodeId: selectedNode.id,
        command: cmd,
        output,
        timestamp: new Date().toLocaleTimeString(),
        isError,
      },
    ]);

    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIdx + 1 < commandHistory.length ? historyIdx + 1 : historyIdx;
        setHistoryIdx(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal('');
      }
    }
  };

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[600px]">
      {/* Terminal Titlebar & Host Switcher */}
      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-slate-200">
            Terminal Bash Interactiva &bull; Docker Container Console
          </span>
        </div>

        {/* Container Node Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedNodeId(n.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedNodeId === n.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Server className="w-3 h-3" />
              <span>{n.hostname}</span>
            </button>
          ))}

          <button
            onClick={() => setHistory([])}
            title="Limpiar pantalla"
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all ml-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Command Toolbar for Beginners */}
      <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
        <span className="text-slate-500 font-sans font-semibold text-xs whitespace-nowrap">
          Comandos Rápidos:
        </span>
        {selectedNode.role === 'firewall' ? (
          <>
            <button
              onClick={() => executeCommand('ufw status verbose')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              ufw status verbose
            </button>
            <button
              onClick={() => executeCommand('sysctl net.ipv4.ip_forward')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              sysctl ip_forward
            </button>
            <button
              onClick={() => executeCommand('ip route show')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              ip route show
            </button>
            <button
              onClick={() => executeCommand('ufw default deny forward')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              ufw default deny forward
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => executeCommand('curl -I http://172.20.0.10')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              curl -I http://172.20.0.10 (DMZ :80)
            </button>
            <button
              onClick={() => executeCommand('curl http://172.30.0.20:8080')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              curl http://172.30.0.20:8080 (API :8080)
            </button>
            <button
              onClick={() => executeCommand('ip route show')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 whitespace-nowrap cursor-pointer"
            >
              ip route show
            </button>
          </>
        )}
      </div>

      {/* Terminal Output Body */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs sm:text-[13px] space-y-3 bg-slate-950 select-text">
        <div className="text-slate-500 text-xs">
          Conectado a <span className="text-cyan-400 font-bold">{selectedNode.hostname}</span> ({selectedNode.interfaces[0]?.ip}) &bull; Linux Kernel 6.6-wsl2. Escribe &apos;help&apos; para ver comandos.
        </div>

        {history.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center justify-between text-slate-400 group">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">root@{selectedNode.hostname}:~#</span>
                <span className="text-white font-bold">{item.command}</span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-slate-600">{item.timestamp}</span>
                <button
                  onClick={() => handleCopy(item.id, item.output)}
                  className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                  title="Copiar salida"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <pre
              className={`p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 whitespace-pre-wrap ${
                item.isError ? 'text-rose-400 border-rose-900/40' : 'text-slate-300'
              }`}
            >
              {item.output}
            </pre>
          </div>
        ))}

        <div ref={terminalEndRef} />
      </div>

      {/* Interactive Command Input Line */}
      <div className="bg-slate-900/90 p-3 border-t border-slate-800 flex items-center gap-2">
        <span className="text-emerald-400 font-mono font-bold text-xs shrink-0">
          root@{selectedNode.hostname}:~#
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comando (ej: ufw status verbose, curl http://172.20.0.10, sysctl net.ipv4.ip_forward=1)..."
          className="flex-1 bg-transparent font-mono text-xs sm:text-sm text-white focus:outline-none placeholder:text-slate-600"
          autoFocus
        />
        <button
          onClick={() => executeCommand(inputVal)}
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-slate-950" />
          <span>Ejecutar</span>
        </button>
      </div>
    </div>
  );
};
