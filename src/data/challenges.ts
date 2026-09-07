import { ChallengeTask } from '../types';

export const CHALLENGES: ChallengeTask[] = [
  {
    id: 'desafio-1',
    title: 'Misión 1: Habilitar Acceso Web a la DMZ',
    difficulty: 'Fácil',
    category: 'Reglas UFW',
    description:
      'Los usuarios externos no pueden ver la página web corporativa en el servidor Nginx DMZ (172.20.0.10:80). Necesitas crear una regla en UFW para permitir el tráfico HTTP en puerto 80.',
    goal: 'Permitir que cualquier origen pueda acceder por TCP al puerto 80 de 172.20.0.10.',
    testRequest: {
      sourceNodeId: 'cliente_externo',
      destNodeId: 'nginx_dmz',
      protocol: 'tcp',
      destPort: 80,
      payloadType: 'HTTP GET',
    },
    expectedVerdict: 'ALLOWED',
    hint: 'Usa el comando "ufw route allow" o "ufw allow" indicando el puerto 80/tcp y la IP de destino 172.20.0.10.',
    solutionCommand: 'ufw route allow in on eth0 out on eth0 to 172.20.0.10 port 80 proto tcp',
    explanation:
      'Al permitir el puerto 80 hacia la IP 172.20.0.10, el tráfico HTTP atraviesa el firewall y el servidor Nginx responde con 200 OK.',
  },
  {
    id: 'desafio-2',
    title: 'Misión 2: Aislar la API Interna de Clientes Externos',
    difficulty: 'Intermedio',
    category: 'Segmentación',
    description:
      'Un atacante externo (172.20.0.50) está intentando acceder directamente a la API interna de base de datos (172.30.0.20:8080). Debes asegurar que los clientes externos sean bloqueados, pero que Nginx DMZ (172.20.0.10) SÍ pueda comunicarse con la API.',
    goal: 'Garantizar que el Cliente Externo reciba BLOCKED o REJECTED al intentar conectar al puerto 8080 de 172.30.0.20.',
    testRequest: {
      sourceNodeId: 'cliente_externo',
      destNodeId: 'nginx_internal',
      protocol: 'tcp',
      destPort: 8080,
      payloadType: 'HTTP GET',
    },
    expectedVerdict: 'BLOCKED_BY_UFW',
    hint: 'La política por defecto de reenvío debe ser "deny", y la regla para el puerto 8080 solo debe tener como origen "from 172.20.0.10", no "Anywhere".',
    solutionCommand: 'ufw route allow in on eth0 out on eth1 from 172.20.0.10 to 172.30.0.20 port 8080 proto tcp',
    explanation:
      'Al restringir la regla de paso con "from 172.20.0.10", cualquier paquete proveniente del cliente externo (172.20.0.50) es descartado por el firewall.',
  },
  {
    id: 'desafio-3',
    title: 'Misión 3: Proteger la Base de Datos MySQL contra Accesos Directos',
    difficulty: 'Intermedio',
    category: 'Seguridad',
    description:
      'El puerto 3306 (MySQL) en la red interna contiene información crítica. Asegura una regla explícita de bloqueo (DENY o REJECT) para cualquier tráfico proveniente de toda la subred DMZ (172.20.0.0/24).',
    goal: 'Verificar que cualquier intento de conexión al puerto 3306 sea rechazado por el Firewall.',
    testRequest: {
      sourceNodeId: 'nginx_dmz',
      destNodeId: 'nginx_internal',
      protocol: 'tcp',
      destPort: 3306,
      payloadType: 'MySQL Query',
    },
    expectedVerdict: 'BLOCKED_BY_UFW',
    hint: 'Usa "ufw deny" o "ufw route deny" especificando el puerto 3306/tcp y la subred origen 172.20.0.0/24.',
    solutionCommand: 'ufw route deny from 172.20.0.0/24 to 172.30.0.0/24 port 3306 proto tcp',
    explanation:
      'Esto evita ataques de movimiento lateral (Pivoting) en caso de que el servidor web DMZ sufra una vulnerabilidad.',
  },
  {
    id: 'desafio-4',
    title: 'Misión 4: Permitir SSH al Firewall solo desde el Admin PC',
    difficulty: 'Fácil',
    category: 'Reglas UFW',
    description:
      'Para administrar el Firewall de forma segura por SSH (puerto 22), solo la estación de trabajo de administración (172.30.0.30) debe tener permiso. El cliente externo debe ser bloqueado.',
    goal: 'Probar que Admin PC puede conectarse por SSH al Firewall pero los demás orígenes sean descartados.',
    testRequest: {
      sourceNodeId: 'admin_pc',
      destNodeId: 'ubuntu_firewall',
      protocol: 'tcp',
      destPort: 22,
      payloadType: 'SSH Connect',
    },
    expectedVerdict: 'ALLOWED',
    hint: 'Crea una regla de entrada (INPUT) en UFW con "from 172.30.0.30 to any port 22 proto tcp".',
    solutionCommand: 'ufw allow from 172.30.0.30 to any port 22 proto tcp',
    explanation:
      'La regla INPUT permite a la IP autorizada del administrador conectarse localmente al servicio SSH del Firewall.',
  },
  {
    id: 'desafio-5',
    title: 'Misión 5: Reenvío IP del Kernel y Enrutamiento Activo',
    difficulty: 'Avanzado',
    category: 'Enrutamiento',
    description:
      'Verifica que el parámetro de kernel "net.ipv4.ip_forward" esté habilitado en el Firewall. Sin esto, ningún paquete entre subredes podrá ser reenviado aunque las reglas UFW lo permitan.',
    goal: 'Asegurar que el tráfico legítimo entre DMZ e Interna fluya a través del Gateway 172.20.0.254 / 172.30.0.254.',
    testRequest: {
      sourceNodeId: 'nginx_dmz',
      destNodeId: 'nginx_internal',
      protocol: 'tcp',
      destPort: 8080,
      payloadType: 'HTTP GET',
    },
    expectedVerdict: 'ALLOWED',
    hint: 'Verifica en el simulador o terminal que "sysctl net.ipv4.ip_forward = 1" esté activo.',
    solutionCommand: 'sysctl -w net.ipv4.ip_forward=1',
    explanation:
      'El parámetro ip_forward convierte el kernel de Linux en un enrutador activo entre las interfaces eth0 y eth1.',
  },
];
