export type Protocol = 'tcp' | 'udp' | 'icmp' | 'any';
export type ActionType = 'ALLOW' | 'DENY' | 'REJECT' | 'LIMIT';
export type DirectionType = 'IN' | 'OUT' | 'FORWARD' | 'ROUTE';

export interface RouteEntry {
  id: string;
  destination: string;    // e.g. "172.20.0.0" or "0.0.0.0"
  genmask: string;        // e.g. "255.255.255.0"
  gateway: string;        // e.g. "0.0.0.0" or "172.20.0.254"
  flags: string;          // e.g. "U", "UG"
  metric: number;
  iface: string;          // "eth0", "eth1", "lo"
  description?: string;
}

export interface UfwRule {
  id: string;
  number: number;
  action: ActionType;
  direction: DirectionType;
  protocol: Protocol;
  fromIp: string;         // e.g. "Anywhere", "172.20.0.0/24", "172.20.0.50"
  fromPort?: number | string;
  toIp: string;           // e.g. "Anywhere", "172.30.0.20"
  toPort?: number | string; // e.g. 80, 8080, 22
  inInterface?: string;   // e.g. "eth0"
  outInterface?: string;  // e.g. "eth1"
  comment?: string;
  enabled: boolean;
  isRouted?: boolean;
}

export interface UfwConfig {
  enabled: boolean;
  defaultIncoming: 'deny' | 'allow' | 'reject';
  defaultOutgoing: 'deny' | 'allow';
  defaultForward: 'deny' | 'allow' | 'reject';
  ipForwardingEnabled: boolean; // sysctl net.ipv4.ip_forward = 1
  rules: UfwRule[];
}

export interface NetworkInterface {
  name: string;
  ip: string;
  subnetMask: string;
  networkName: string;
  mac: string;
}

export interface ContainerNode {
  id: string;
  name: string;
  hostname: string;
  role: 'firewall' | 'web-dmz' | 'internal-api' | 'client-external' | 'admin-client';
  image: string;
  description: string;
  status: 'running' | 'stopped';
  interfaces: NetworkInterface[];
  openPorts: { port: number; protocol: 'tcp' | 'udp'; service: string; description: string }[];
  routes: RouteEntry[];
  icon: string;
  x: number;
  y: number;
}

export interface NetworkSegment {
  id: string;
  name: string;
  cidr: string;
  gatewayIp: string;
  description: string;
  color: string;
  borderClass: string;
  bgClass: string;
  badgeClass: string;
}

export interface PacketTestRequest {
  sourceNodeId: string;
  destNodeId: string;
  protocol: Protocol;
  destPort: number;
  payloadType: 'HTTP GET' | 'PING (ICMP)' | 'SSH Connect' | 'MySQL Query' | 'Custom Probe';
  customPayload?: string;
}

export interface PacketHop {
  nodeId: string;
  nodeName: string;
  action: 'SOURCE_SEND' | 'ROUTE_LOOKUP' | 'UFW_INSPECT' | 'FORWARD' | 'DELIVER' | 'DROP' | 'REJECT' | 'RESPONSE_OK' | 'RESPONSE_ERROR';
  description: string;
  detail: string;
  timestamp: string;
  status: 'pass' | 'drop' | 'reject' | 'info';
  ruleMatched?: UfwRule;
  routeUsed?: RouteEntry;
}

export interface SimulationResult {
  id: string;
  timestamp: string;
  request: PacketTestRequest;
  verdict: 'ALLOWED' | 'BLOCKED_BY_UFW' | 'REJECTED_BY_UFW' | 'NO_ROUTE' | 'PORT_CLOSED' | 'IP_FORWARD_DISABLED';
  statusSummary: string;
  hops: PacketHop[];
  rawLog: string;
  durationMs: number;
}

export interface LabStep {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  conceptExplanation: string;
  commands: {
    command: string;
    description: string;
    context: 'windows-powershell' | 'firewall-container' | 'client-container' | 'host';
  }[];
  expectedOutcome: string;
  troubleshootingTip: string;
  keyTakeaway: string;
}

export interface ChallengeTask {
  id: string;
  title: string;
  difficulty: 'Fácil' | 'Intermedio' | 'Avanzado';
  category: 'Enrutamiento' | 'Reglas UFW' | 'Segmentación' | 'Seguridad';
  description: string;
  goal: string;
  testRequest: PacketTestRequest;
  expectedVerdict: 'ALLOWED' | 'BLOCKED_BY_UFW' | 'REJECTED_BY_UFW';
  hint: string;
  solutionCommand: string;
  explanation: string;
}

export interface TerminalHistoryItem {
  id: string;
  command: string;
  output: string;
  nodeId: string;
  timestamp: string;
  isError?: boolean;
}
