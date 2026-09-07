import { LabStep } from '../types';

export const LAB_STEPS: LabStep[] = [
  {
    id: 1,
    title: 'Paso 1: Entorno en Docker Desktop para Windows',
    subtitle: 'Requisitos previos y preparación de WSL 2',
    badge: 'Preparación',
    description:
      'Para que un contenedor actúe como Firewall y Router, Docker necesita permisos para manipular tablas de red de Linux (NET_ADMIN) y el backend de WSL 2 en Windows.',
    conceptExplanation:
      'Docker Desktop para Windows utiliza una máquina virtual ligera con WSL 2 (Windows Subsystem for Linux). En este entorno crearemos 2 redes virtuales tipo Bridge aisladas: "red_dmz" (172.20.0.0/24) y "red_interna" (172.30.0.0/24). Por defecto, los contenedores en redes distintas no pueden hablar entre sí a menos que un router/firewall intermedio enrute los paquetes.',
    commands: [
      {
        command: 'wsl --status',
        description: 'Verificar en PowerShell que WSL 2 esté instalado y configurado como versión predeterminada.',
        context: 'windows-powershell',
      },
      {
        command: 'docker version',
        description: 'Comprobar que Docker Desktop está corriendo y conectado al motor de Linux.',
        context: 'windows-powershell',
      },
      {
        command: 'mkdir laboratorio-firewall && cd laboratorio-firewall',
        description: 'Crear la carpeta del proyecto en tu máquina Windows.',
        context: 'windows-powershell',
      },
    ],
    expectedOutcome:
      'Docker Desktop debe mostrar el icono en verde "Engine running" y PowerShell devolverá la versión de Docker y WSL 2.',
    troubleshootingTip:
      'Si Docker da error de conexión, asegúrate de activar "Use the WSL 2 based engine" en Settings > General de Docker Desktop.',
    keyTakeaway:
      'La segmentación de red comienza a nivel físico o lógico: dos redes aisladas nunca deben comunicarse sin un punto de control.',
  },
  {
    id: 2,
    title: 'Paso 2: Arquitectura y Docker Compose',
    subtitle: 'Definición de redes aisladas y contenedores Nginx',
    badge: 'Despliegue',
    description:
      'Desplegaremos 4 contenedores: El Firewall Ubuntu conectado a ambas redes (Dual-Homed), un Nginx público en DMZ, un Nginx de API en la red interna, y un cliente de pruebas.',
    conceptExplanation:
      'El contenedor "ubuntu-firewall" tiene asignadas dos interfaces: eth0 en la red 172.20.0.0/24 y eth1 en la red 172.30.0.0/24. Requiere la capacidad "NET_ADMIN" y el sysctl "net.ipv4.ip_forward=1" para que el kernel de Linux acepte reenviar paquetes de una interfaz a la otra.',
    commands: [
      {
        command: 'docker compose up -d --build',
        description: 'Construir y levantar todos los contenedores y subredes en segundo plano.',
        context: 'windows-powershell',
      },
      {
        command: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"',
        description: 'Verificar que los 4 contenedores estén en estado "Up".',
        context: 'windows-powershell',
      },
      {
        command: 'docker network ls',
        description: 'Listar las redes creadas: debe aparecer red_dmz y red_interna.',
        context: 'windows-powershell',
      },
    ],
    expectedOutcome:
      'Verás creadas las redes dmz_net e internal_net y 4 contenedores funcionando con sus respectivas IPs fijas.',
    troubleshootingTip:
      'Si el contenedor de firewall se reinicia, revisa que incluiste "cap_add: - NET_ADMIN" en tu docker-compose.yml.',
    keyTakeaway:
      'Un dispositivo "Dual-Homed" actúa como puente físico/lógico entre dos mundos que de otro modo estarían 100% aislados.',
  },
  {
    id: 3,
    title: 'Paso 3: Enrutamiento y Reenvío de Paquetes (IP Forwarding)',
    subtitle: 'Configurar el kernel de Linux y tablas de rutas',
    badge: 'Enrutamiento',
    description:
      'Por defecto, Linux descarta paquetes que no van dirigidos a su propia IP. Habilitaremos el reenvío IP (IP Forwarding) y verificaremos la tabla de rutas.',
    conceptExplanation:
      'La tabla de enrutamiento (Routing Table) le dice al sistema operativo: "Si quieres llegar a la red 172.30.0.0/24, envíalo por la interfaz eth1; si es 172.20.0.0/24, por eth0". Los demás contenedores deben tener como Puerta de Enlace (Default Gateway) la IP del Firewall.',
    commands: [
      {
        command: 'docker exec -it ubuntu-firewall bash',
        description: 'Entrar a la consola del contenedor Firewall.',
        context: 'windows-powershell',
      },
      {
        command: 'sysctl net.ipv4.ip_forward',
        description: 'Verificar si el reenvío de paquetes está activo (debe responder net.ipv4.ip_forward = 1).',
        context: 'firewall-container',
      },
      {
        command: 'ip route show',
        description: 'Inspeccionar la tabla de rutas del kernel: muestra las rutas directas a 172.20.0.0/24 y 172.30.0.0/24.',
        context: 'firewall-container',
      },
      {
        command: 'ip addr show',
        description: 'Confirmar que eth0 tiene 172.20.0.254 y eth1 tiene 172.30.0.254.',
        context: 'firewall-container',
      },
    ],
    expectedOutcome:
      'El kernel tiene rutas directas hacia ambas subredes a través de eth0 y eth1 con reenvío de paquetes habilitado.',
    troubleshootingTip:
      'Si ip_forward está en 0, actívalo con: sysctl -w net.ipv4.ip_forward=1 o edita /etc/sysctl.conf.',
    keyTakeaway:
      'El Firewall primero debe saber ENRUTAR (hacia dónde va el paquete) antes de decidir FILTRAR (si lo deja pasar o lo bloquea).',
  },
  {
    id: 4,
    title: 'Paso 4: Configuración de UFW (Uncomplicated Firewall)',
    subtitle: 'Políticas restrictivas por defecto y reglas de paso',
    badge: 'Seguridad UFW',
    description:
      'Configuraremos el principio de Mínimo Privilegio: Bloquear todo por defecto (Default Deny) y abrir únicamente los puertos necesarios de forma explícita.',
    conceptExplanation:
      'UFW gestiona iptables en Linux. En un firewall de red/router, existen 2 tipos de tráfico: INPUT (tráfico dirigido al propio firewall, ej. SSH puerto 22) y FORWARD/ROUTE (tráfico que atraviesa el firewall de una red a otra, ej. del Cliente a Nginx).',
    commands: [
      {
        command: 'ufw default deny incoming',
        description: 'Política 1: Bloquear cualquier conexión entrante hacia el propio Firewall.',
        context: 'firewall-container',
      },
      {
        command: 'ufw default allow outgoing',
        description: 'Política 2: Permitir tráfico saliente originado por el Firewall.',
        context: 'firewall-container',
      },
      {
        command: 'ufw default deny forward',
        description: 'Política 3 (CRÍTICA): Bloquear todo el tráfico que intente cruzar entre subredes.',
        context: 'firewall-container',
      },
      {
        command: 'ufw route allow in on eth0 out on eth0 to 172.20.0.10 port 80 proto tcp',
        description: 'Regla 1: Permitir tráfico HTTP (puerto 80) hacia el servidor Nginx Web DMZ.',
        context: 'firewall-container',
      },
      {
        command: 'ufw route allow in on eth0 out on eth1 from 172.20.0.10 to 172.30.0.20 port 8080 proto tcp',
        description: 'Regla 2: Permitir SOLAMENTE a Nginx DMZ consultar la API interna en 172.30.0.20:8080.',
        context: 'firewall-container',
      },
      {
        command: 'ufw --force enable && ufw status verbose',
        description: 'Activar UFW e imprimir el estado detallado de las reglas.',
        context: 'firewall-container',
      },
    ],
    expectedOutcome:
      'UFW responderá "Status: active" mostrando la tabla de reglas activas y las políticas por defecto.',
    troubleshootingTip:
      'Para que UFW reenvíe paquetes entre interfaces, en /etc/default/ufw la directiva DEFAULT_FORWARD_POLICY debe estar configurada.',
    keyTakeaway:
      'El modelo "Zero Trust" exige que la comunicación interna esté bloqueada a menos que exista una regla explícita que la autorice.',
  },
  {
    id: 5,
    title: 'Paso 5: Pruebas de Tráfico y Validación con Nginx',
    subtitle: 'Simulación de peticiones legítimas vs ataques bloqueados',
    badge: 'Pruebas Prácticas',
    description:
      'Realizaremos pruebas de conectividad desde el Cliente Externo y desde Nginx DMZ para comprobar que el firewall protege los servicios internos.',
    conceptExplanation:
      'Usaremos "curl" para verificar peticiones HTTP y códigos de estado (200 OK vs Connection Timed Out / Connection Refused) y "ping" (ICMP) para constatar que el aislamiento funciona en capas 3 y 4 del modelo OSI.',
    commands: [
      {
        command: 'docker exec -it cliente-externo curl -I http://172.20.0.10',
        description: 'Prueba 1 (Permitida): Cliente accede a Nginx DMZ en puerto 80 -> HTTP 200 OK.',
        context: 'windows-powershell',
      },
      {
        command: 'docker exec -it cliente-externo curl --connect-timeout 3 http://172.30.0.20:8080',
        description: 'Prueba 2 (BLOQUEADA): Cliente intenta acceder a la API Interna -> Bloqueado por UFW (Timeout).',
        context: 'windows-powershell',
      },
      {
        command: 'docker exec -it nginx-web-dmz curl -I http://172.30.0.20:8080',
        description: 'Prueba 3 (Permitida): Nginx DMZ consulta la API Interna autorizada -> HTTP 200 OK.',
        context: 'windows-powershell',
      },
      {
        command: 'docker exec -it cliente-externo ping -c 2 172.30.0.20',
        description: 'Prueba 4 (BLOQUEADA): Ping directo hacia la red interna es descartado.',
        context: 'windows-powershell',
      },
    ],
    expectedOutcome:
      'El cliente externo puede ver la web pública pero no tiene ninguna forma de alcanzar la API o base de datos interna.',
    troubleshootingTip:
      'Si la prueba 3 falla, verifica que la IP de origen en la regla UFW coincida exactamente con la IP de Nginx DMZ (172.20.0.10).',
    keyTakeaway:
      'Las pruebas negativas (intentar acceder a lo prohibido y comprobar que falla) son tan importantes como las pruebas positivas.',
  },
  {
    id: 6,
    title: 'Paso 6: Monitoreo, Logs y Auditoría de Seguridad',
    subtitle: 'Lectura de /var/log/ufw.log y análisis forense',
    badge: 'Monitoreo',
    description:
      'Todo firewall debe ser auditable. Aprenderás a leer los registros de paquetes descartados en tiempo real con dmesg y el log de UFW.',
    conceptExplanation:
      'Cuando UFW bloquea un paquete (DROP o REJECT), genera una entrada en el log del kernel que incluye: [UFW BLOCK] IN=eth0 OUT= MAC= SRC=172.20.0.50 DST=172.30.0.20 PROTO=TCP SPT=49152 DPT=8080 SYN. Esto permite detectar escaneos de puertos y ataques en tiempo real.',
    commands: [
      {
        command: 'docker exec -it ubuntu-firewall tail -n 20 /var/log/ufw.log',
        description: 'Ver los últimos registros de eventos y bloqueos en el firewall.',
        context: 'windows-powershell',
      },
      {
        command: 'docker exec -it ubuntu-firewall dmesg | grep "[UFW BLOCK]" | tail -n 10',
        description: 'Filtrar paquetes bloqueados directamente del buffer del kernel de Linux.',
        context: 'windows-powershell',
      },
      {
        command: 'docker compose down',
        description: 'Comando para limpiar y detener el laboratorio al finalizar la práctica.',
        context: 'windows-powershell',
      },
    ],
    expectedOutcome:
      'Aparecerán las líneas de log con marcas de tiempo, IPs de origen, destino y puertos descartados.',
    troubleshootingTip:
      'Si el archivo ufw.log está vacío, asegúrate de haber activado el registro con: ufw logging on.',
    keyTakeaway:
      'Un firewall sin logs es una caja negra. La visibilidad es la base de la ciberseguridad.',
  },
];
