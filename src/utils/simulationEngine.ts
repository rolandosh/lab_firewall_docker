import {
  ContainerNode,
  NetworkSegment,
  PacketHop,
  PacketTestRequest,
  SimulationResult,
  UfwConfig,
  UfwRule,
} from '../types';

/**
 * Checks whether an IP matches a CIDR or IP pattern (e.g. "172.20.0.0/24", "172.20.0.10", "Anywhere")
 */
export function ipMatches(targetIp: string, rulePattern: string): boolean {
  if (!rulePattern || rulePattern.toLowerCase() === 'anywhere' || rulePattern === '0.0.0.0/0' || rulePattern === 'any') {
    return true;
  }
  if (rulePattern === targetIp) {
    return true;
  }
  if (rulePattern.includes('/')) {
    const [baseIp, bitsStr] = rulePattern.split('/');
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits)) return false;

    // Simple /24 or /16 check for classroom lab standard subnets
    if (bits === 24) {
      const targetPrefix = targetIp.split('.').slice(0, 3).join('.');
      const basePrefix = baseIp.split('.').slice(0, 3).join('.');
      return targetPrefix === basePrefix;
    }
    if (bits === 16) {
      const targetPrefix = targetIp.split('.').slice(0, 2).join('.');
      const basePrefix = baseIp.split('.').slice(0, 2).join('.');
      return targetPrefix === basePrefix;
    }
    if (bits === 32) {
      return targetIp === baseIp;
    }
  }
  return false;
}

/**
 * Evaluates a packet request against the network topology, routing tables, and UFW firewall configuration.
 */
export function simulatePacketTraversal(
  request: PacketTestRequest,
  nodes: ContainerNode[],
  segments: NetworkSegment[],
  ufwConfig: UfwConfig
): SimulationResult {
  const hops: PacketHop[] = [];
  const startTime = Date.now();
  const timestamp = new Date().toLocaleTimeString('es-ES', { hour12: false });

  const sourceNode = nodes.find((n) => n.id === request.sourceNodeId);
  const destNode = nodes.find((n) => n.id === request.destNodeId);
  const firewallNode = nodes.find((n) => n.role === 'firewall');

  if (!sourceNode || !destNode || !firewallNode) {
    return {
      id: `sim-${Date.now()}`,
      timestamp,
      request,
      verdict: 'NO_ROUTE',
      statusSummary: 'Error: Nodo de origen o destino no encontrado en la topología.',
      hops: [],
      rawLog: '[ERROR] Topology inconsistency.',
      durationMs: 0,
    };
  }

  const srcIp = sourceNode.interfaces[0]?.ip || '0.0.0.0';
  const destIp = destNode.interfaces[0]?.ip || '0.0.0.0';
  const srcNet = sourceNode.interfaces[0]?.networkName;
  const destNet = destNode.interfaces[0]?.networkName;

  // Hop 1: Source generates packet
  hops.push({
    nodeId: sourceNode.id,
    nodeName: sourceNode.name,
    action: 'SOURCE_SEND',
    description: `Generando paquete ${request.protocol.toUpperCase()} hacia ${destIp}:${request.destPort}`,
    detail: `Origen: ${srcIp} (${sourceNode.interfaces[0]?.name}) -> Destino: ${destIp}:${request.destPort} [Payload: ${request.payloadType}]`,
    timestamp,
    status: 'info',
  });

  // Check if same subnet (direct communication without router)
  const isDirectSameSubnet = srcNet === destNet && sourceNode.id !== firewallNode.id && destNode.id !== firewallNode.id;

  if (isDirectSameSubnet) {
    hops.push({
      nodeId: sourceNode.id,
      nodeName: sourceNode.name,
      action: 'ROUTE_LOOKUP',
      description: `Misma subred local (${srcNet}). Envío directo vía ARP / Switch virtual de Docker.`,
      detail: `La IP de destino ${destIp} pertenece al segmento local. No requiere pasar por el gateway del firewall.`,
      timestamp,
      status: 'pass',
    });

    const isPortOpen = destNode.openPorts.some((p) => p.port === request.destPort) || request.protocol === 'icmp';
    if (isPortOpen) {
      hops.push({
        nodeId: destNode.id,
        nodeName: destNode.name,
        action: 'DELIVER',
        description: `Paquete entregado exitosamente al servicio en puerto ${request.destPort}`,
        detail: `El servidor ${destNode.name} procesó la solicitud y responde HTTP 200 / Echo Reply.`,
        timestamp,
        status: 'pass',
      });
      return {
        id: `sim-${Date.now()}`,
        timestamp,
        request,
        verdict: 'ALLOWED',
        statusSummary: `Comunicación directa en la misma subred permitida (${srcNet}).`,
        hops,
        rawLog: `[SAME_SUBNET_ALLOW] SRC=${srcIp} DST=${destIp} PROTO=${request.protocol.toUpperCase()} DPT=${request.destPort}`,
        durationMs: Date.now() - startTime + 12,
      };
    } else {
      hops.push({
        nodeId: destNode.id,
        nodeName: destNode.name,
        action: 'RESPONSE_ERROR',
        description: `Puerto ${request.destPort} cerrado en el destino`,
        detail: `El host de destino respondió TCP RST o ICMP Port Unreachable.`,
        timestamp,
        status: 'reject',
      });
      return {
        id: `sim-${Date.now()}`,
        timestamp,
        request,
        verdict: 'PORT_CLOSED',
        statusSummary: `Destino alcanzable en la red local, pero el puerto ${request.destPort} está cerrado.`,
        hops,
        rawLog: `[PORT_CLOSED] SRC=${srcIp} DST=${destIp} DPT=${request.destPort} RST_SENT`,
        durationMs: Date.now() - startTime + 10,
      };
    }
  }

  // Hop 2: Route lookup at source pointing to Default Gateway
  const defaultRoute = sourceNode.routes.find((r) => r.destination === '0.0.0.0');
  const gatewayIp = defaultRoute?.gateway || (srcNet === 'red_dmz' ? '172.20.0.254' : '172.30.0.254');

  hops.push({
    nodeId: sourceNode.id,
    nodeName: sourceNode.name,
    action: 'ROUTE_LOOKUP',
    description: `Consultando tabla de rutas. Destino en subred remota (${destNet || 'externa'}).`,
    detail: `Enviando paquete a la Puerta de Enlace predeterminada (Gateway: ${gatewayIp} - Firewall).`,
    timestamp,
    status: 'pass',
  });

  // Hop 3: Packet arrives at Ubuntu Firewall
  hops.push({
    nodeId: firewallNode.id,
    nodeName: firewallNode.name,
    action: 'ROUTE_LOOKUP',
    description: `Paquete recibido en el Firewall por la interfaz ${srcNet === 'red_dmz' ? 'eth0' : 'eth1'}`,
    detail: `El kernel de Ubuntu recibe el paquete proveniente de ${srcIp} con destino ${destIp}:${request.destPort}`,
    timestamp,
    status: 'info',
  });

  // Check if IP forwarding is enabled in Firewall Kernel
  if (!ufwConfig.ipForwardingEnabled && destNode.id !== firewallNode.id) {
    hops.push({
      nodeId: firewallNode.id,
      nodeName: firewallNode.name,
      action: 'DROP',
      description: `Reenvío IP deshabilitado en el Kernel (net.ipv4.ip_forward = 0)`,
      detail: `Linux descarta el paquete porque no está configurado como enrutador para reenviar entre interfaces.`,
      timestamp,
      status: 'drop',
    });
    return {
      id: `sim-${Date.now()}`,
      timestamp,
      request,
      verdict: 'IP_FORWARD_DISABLED',
      statusSummary: 'El reenvío IP (IP Forwarding) está desactivado en el Firewall. Ejecuta "sysctl -w net.ipv4.ip_forward=1".',
      hops,
      rawLog: `[KERNEL_DROP] sysctl net.ipv4.ip_forward=0: Cannot forward packet from ${srcIp} to ${destIp}`,
      durationMs: Date.now() - startTime + 8,
    };
  }

  // Hop 4: UFW Firewall Rule Inspection
  const isTrafficDirectToFirewall = destNode.id === firewallNode.id;
  let ruleMatched: UfwRule | undefined;
  let ruleDecision: 'ALLOW' | 'DENY' | 'REJECT' | 'LIMIT' | 'DEFAULT' = 'DEFAULT';

  if (!ufwConfig.enabled) {
    // If UFW is disabled, everything is routed allowed by default
    hops.push({
      nodeId: firewallNode.id,
      nodeName: firewallNode.name,
      action: 'UFW_INSPECT',
      description: `Firewall UFW inactivo (Status: inactive)`,
      detail: `No hay filtrado de paquetes activo. El tráfico pasa directamente a través del enrutador.`,
      timestamp,
      status: 'pass',
    });
    ruleDecision = 'ALLOW';
  } else {
    // Evaluate rules in priority order (1, 2, 3...)
    for (const rule of ufwConfig.rules) {
      if (!rule.enabled) continue;

      // Check direction: IN for traffic to firewall itself, ROUTE/FORWARD for forwarded traffic
      if (isTrafficDirectToFirewall && rule.direction === 'OUT') continue;
      if (!isTrafficDirectToFirewall && rule.direction === 'IN') continue;

      // Check protocol
      if (rule.protocol !== 'any' && request.protocol !== 'any' && rule.protocol !== request.protocol) {
        continue;
      }

      // Check Source IP
      if (!ipMatches(srcIp, rule.fromIp)) {
        continue;
      }

      // Check Destination IP
      if (!ipMatches(destIp, rule.toIp)) {
        continue;
      }

      // Check Destination Port (if specified)
      if (rule.toPort !== undefined && rule.toPort !== '' && rule.toPort !== 0) {
        const rulePort = typeof rule.toPort === 'string' ? parseInt(rule.toPort, 10) : rule.toPort;
        if (rulePort !== request.destPort) {
          continue;
        }
      }

      // We found a match!
      ruleMatched = rule;
      ruleDecision = rule.action;
      break;
    }

    // If no explicit rule matched, fallback to default policies
    if (!ruleMatched) {
      if (isTrafficDirectToFirewall) {
        ruleDecision = ufwConfig.defaultIncoming === 'allow' ? 'ALLOW' : ufwConfig.defaultIncoming === 'reject' ? 'REJECT' : 'DENY';
      } else {
        ruleDecision = ufwConfig.defaultForward === 'allow' ? 'ALLOW' : ufwConfig.defaultForward === 'reject' ? 'REJECT' : 'DENY';
      }
    }

    if (ruleDecision === 'ALLOW') {
      hops.push({
        nodeId: firewallNode.id,
        nodeName: firewallNode.name,
        action: 'UFW_INSPECT',
        description: ruleMatched
          ? `Regla #${ruleMatched.number} coincidente: PERMITIR (ALLOW)`
          : `Política por defecto: PERMITIR (${isTrafficDirectToFirewall ? 'Default Incoming' : 'Default Forward'})`,
        detail: ruleMatched
          ? `Regla coincidente: "${ruleMatched.comment || 'Regla ' + ruleMatched.number}". De ${ruleMatched.fromIp} a ${ruleMatched.toIp}:${ruleMatched.toPort || 'ANY'} [${ruleMatched.protocol.toUpperCase()}].`
          : `Ninguna regla explícita denegó el paquete. Aplicada política predeterminada ACCEPT.`,
        timestamp,
        status: 'pass',
        ruleMatched,
      });
    } else if (ruleDecision === 'REJECT') {
      hops.push({
        nodeId: firewallNode.id,
        nodeName: firewallNode.name,
        action: 'REJECT',
        description: ruleMatched
          ? `Regla #${ruleMatched.number} coincidente: RECHAZAR (REJECT)`
          : `Política por defecto: RECHAZAR (${isTrafficDirectToFirewall ? 'Default Incoming' : 'Default Forward'})`,
        detail: `UFW envió un paquete de rechazo activo (TCP RST / ICMP Port Unreachable) al origen.`,
        timestamp,
        status: 'reject',
        ruleMatched,
      });

      return {
        id: `sim-${Date.now()}`,
        timestamp,
        request,
        verdict: 'REJECTED_BY_UFW',
        statusSummary: `Conexión rechazada activamente por el Firewall UFW (${ruleMatched ? 'Regla #' + ruleMatched.number : 'Política Default'}).`,
        hops,
        rawLog: `[UFW REJECT] IN=${srcNet === 'red_dmz' ? 'eth0' : 'eth1'} OUT=${isTrafficDirectToFirewall ? '' : destNet === 'red_dmz' ? 'eth0' : 'eth1'} SRC=${srcIp} DST=${destIp} PROTO=${request.protocol.toUpperCase()} DPT=${request.destPort}`,
        durationMs: Date.now() - startTime + 15,
      };
    } else {
      // DENY / DROP
      hops.push({
        nodeId: firewallNode.id,
        nodeName: firewallNode.name,
        action: 'DROP',
        description: ruleMatched
          ? `Regla #${ruleMatched.number} coincidente: BLOQUEAR (DENY/DROP)`
          : `Política por defecto: BLOQUEAR (${isTrafficDirectToFirewall ? 'Default Incoming Deny' : 'Default Forward Deny'})`,
        detail: `El firewall descartó silenciosamente el paquete. El cliente experimentará un Connection Timed Out.`,
        timestamp,
        status: 'drop',
        ruleMatched,
      });

      return {
        id: `sim-${Date.now()}`,
        timestamp,
        request,
        verdict: 'BLOCKED_BY_UFW',
        statusSummary: `Paquete descartado (DROP) por el Firewall UFW (${ruleMatched ? 'Regla #' + ruleMatched.number : 'Política Restrictiva Default'}).`,
        hops,
        rawLog: `[UFW BLOCK] IN=${srcNet === 'red_dmz' ? 'eth0' : 'eth1'} OUT=${isTrafficDirectToFirewall ? '' : destNet === 'red_dmz' ? 'eth0' : 'eth1'} SRC=${srcIp} DST=${destIp} PROTO=${request.protocol.toUpperCase()} SPT=51820 DPT=${request.destPort} SYN`,
        durationMs: Date.now() - startTime + 20,
      };
    }
  }

  // Hop 5: If allowed, packet is forwarded out to the destination interface
  if (!isTrafficDirectToFirewall) {
    const outIface = destNet === 'red_dmz' ? 'eth0' : 'eth1';
    hops.push({
      nodeId: firewallNode.id,
      nodeName: firewallNode.name,
      action: 'FORWARD',
      description: `Reenviando paquete hacia la interfaz ${outIface} (${destNet})`,
      detail: `El firewall entrega el paquete a la red de destino ${destNet} hacia la MAC de ${destNode.name}`,
      timestamp,
      status: 'pass',
    });
  }

  // Hop 6: Destination node receives packet and checks open port
  const isDestPortOpen = destNode.openPorts.some((p) => p.port === request.destPort) || request.protocol === 'icmp';

  if (isDestPortOpen) {
    hops.push({
      nodeId: destNode.id,
      nodeName: destNode.name,
      action: 'DELIVER',
      description: `Servicio en ${destNode.name} aceptó la petición en puerto ${request.destPort}`,
      detail: `Respuesta 200 OK enviada de regreso a través de la ruta de retorno establecida.`,
      timestamp,
      status: 'pass',
    });

    return {
      id: `sim-${Date.now()}`,
      timestamp,
      request,
      verdict: 'ALLOWED',
      statusSummary: `Tráfico permitido con éxito por el Firewall y respondido por el servicio en puerto ${request.destPort}.`,
      hops,
      rawLog: `[UFW ALLOW] IN=${srcNet === 'red_dmz' ? 'eth0' : 'eth1'} OUT=${destNet === 'red_dmz' ? 'eth0' : 'eth1'} SRC=${srcIp} DST=${destIp} PROTO=${request.protocol.toUpperCase()} DPT=${request.destPort} HTTP/1.1 200 OK`,
      durationMs: Date.now() - startTime + 25,
    };
  } else {
    hops.push({
      nodeId: destNode.id,
      nodeName: destNode.name,
      action: 'RESPONSE_ERROR',
      description: `Puerto ${request.destPort} cerrado en el destino`,
      detail: `El Firewall permitió el tráfico, pero no hay ningún servicio escuchando en el puerto ${request.destPort} de ${destNode.name}.`,
      timestamp,
      status: 'reject',
    });

    return {
      id: `sim-${Date.now()}`,
      timestamp,
      request,
      verdict: 'PORT_CLOSED',
      statusSummary: `El firewall permitió el paso, pero el puerto ${request.destPort} está cerrado en ${destNode.name}.`,
      hops,
      rawLog: `[PORT_CLOSED] SRC=${srcIp} DST=${destIp} DPT=${request.destPort} TCP_RST received`,
      durationMs: Date.now() - startTime + 18,
    };
  }
}
