export interface DockerProjectFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const DOCKER_PROJECT_FILES: DockerProjectFile[] = [
  {
    name: 'docker-compose.yml',
    path: 'docker-compose.yml',
    language: 'yaml',
    description: 'Definición de las 2 redes aisladas, contenedores Nginx, Firewall con NET_ADMIN y cliente de pruebas.',
    content: `version: '3.8'

# ==========================================================
# Laboratorio de Firewall y Enrutamiento Segmentado
# Diseñado para Docker Desktop (Windows / WSL 2)
# ==========================================================

networks:
  # 1. Red DMZ / Pública (Acceso externo y Web Frontend)
  dmz_net:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/24
          gateway: 172.20.0.1

  # 2. Red Interna / Confidencial (Servicios de Base de Datos y APIs)
  internal_net:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.30.0.0/24
          gateway: 172.30.0.1

services:
  # ========================================================
  # ROUTER / FIREWALL CENTRAL (Ubuntu 22.04 con UFW e iptables)
  # ========================================================
  ubuntu-firewall:
    build:
      context: ./firewall
      dockerfile: Dockerfile
    container_name: ubuntu-firewall
    hostname: ubuntu-firewall
    cap_add:
      - NET_ADMIN      # Permite modificar iptables y rutas
      - NET_RAW        # Permite inspección de paquetes crudos
    sysctls:
      - net.ipv4.ip_forward=1  # Habilita enrutamiento de paquetes en el kernel
    networks:
      dmz_net:
        ipv4_address: 172.20.0.254    # Interfaz eth0 (DMZ)
      internal_net:
        ipv4_address: 172.30.0.254    # Interfaz eth1 (Interna)
    restart: unless-stopped
    command: /bin/bash /entrypoint.sh

  # ========================================================
  # SERVIDOR WEB DMZ (Nginx Público - Puerto 80)
  # ========================================================
  nginx-web-dmz:
    image: nginx:alpine
    container_name: nginx-web-dmz
    hostname: nginx-web-dmz
    volumes:
      - ./nginx-dmz/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx-dmz/html:/usr/share/nginx/html:ro
    networks:
      dmz_net:
        ipv4_address: 172.20.0.10
    ports:
      - "8080:80"      # Mapeado a Windows localhost:8080 para prueba visual
    restart: unless-stopped

  # ========================================================
  # SERVICIO API / BASE DE DATOS INTERNA (Nginx Interno - 8080)
  # ========================================================
  nginx-internal-api:
    image: nginx:alpine
    container_name: nginx-internal-api
    hostname: nginx-internal-api
    volumes:
      - ./nginx-internal/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx-internal/html:/usr/share/nginx/html:ro
    networks:
      internal_net:
        ipv4_address: 172.30.0.20
    # NOTA: Sin mapeo de puertos hacia Windows para simular aislamiento total!
    restart: unless-stopped

  # ========================================================
  # CLIENTE EXTERNO / TESTER (Simula usuario o atacante)
  # ========================================================
  cliente-externo:
    image: alpine:latest
    container_name: cliente-externo
    hostname: cliente-externo
    command: sh -c "apk add --no-cache curl bind-tools iputils iproute2 bash && tail -f /dev/null"
    networks:
      dmz_net:
        ipv4_address: 172.20.0.50
    restart: unless-stopped
`,
  },
  {
    name: 'Dockerfile (Firewall)',
    path: 'firewall/Dockerfile',
    language: 'dockerfile',
    description: 'Imagen Ubuntu 22.04 configurada con UFW, iptables, utilidades de red y scripts de inicialización.',
    content: `FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Instalar UFW, iptables, herramientas de red y diagnóstico
RUN apt-get update && apt-get install -y --no-install-recommends \\
    ufw \\
    iptables \\
    iproute2 \\
    net-tools \\
    iputils-ping \\
    curl \\
    tcpdump \\
    dnsutils \\
    procps \\
    nano \\
    rsyslog && \\
    rm -rf /var/lib/apt/lists/*

# Configurar UFW para permitir reenvío de paquetes por defecto en su archivo de configuración
RUN sed -i 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/g' /etc/default/ufw

# Copiar script de inicialización
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
`,
  },
  {
    name: 'entrypoint.sh',
    path: 'firewall/entrypoint.sh',
    language: 'bash',
    description: 'Script que arranca el Firewall, activa el reenvío IP y configura las reglas iniciales de UFW.',
    content: `#!/bin/bash
set -e

echo "============================================="
echo "   Iniciando Firewall Ubuntu con UFW...     "
echo "============================================="

# 1. Habilitar Reenvío IP en el Kernel
echo 1 > /proc/sys/net/ipv4/ip_forward

# 2. Iniciar servicio de logs si está disponible
service rsyslog start 2>/dev/null || true

# 3. Restablecer UFW a estado limpio
ufw --force reset

# 4. Políticas por defecto
ufw default deny incoming
ufw default allow outgoing
ufw default deny forward

# 5. Regla 1: Permitir tráfico HTTP hacia el servidor Nginx DMZ (172.20.0.10:80)
ufw route allow in on eth0 to 172.20.0.10 port 80 proto tcp

# 6. Regla 2: Permitir únicamente a Nginx DMZ consultar la API Interna (172.30.0.20:8080)
ufw route allow in on eth0 out on eth1 from 172.20.0.10 to 172.30.0.20 port 8080 proto tcp

# 7. Activar UFW
ufw --force enable

echo "---------------------------------------------"
echo "Firewall UFW activado con éxito."
ufw status verbose
echo "---------------------------------------------"

# Mantener el contenedor activo
tail -f /dev/null
`,
  },
  {
    name: 'nginx-dmz/default.conf',
    path: 'nginx-dmz/default.conf',
    language: 'nginx',
    description: 'Configuración del servidor web frontal Nginx en la red DMZ.',
    content: `server {
    listen 80;
    server_name localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    # Proxy inverso opcional hacia la API interna
    location /api/ {
        proxy_pass http://172.30.0.20:8080/;
        proxy_connect_timeout 3s;
        proxy_read_timeout 5s;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
`,
  },
  {
    name: 'nginx-dmz/html/index.html',
    path: 'nginx-dmz/html/index.html',
    language: 'html',
    description: 'Página HTML servida por Nginx DMZ.',
    content: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Portal Web Corporativo (DMZ)</title>
    <style>
        body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center; }
        .card { background: #1e293b; padding: 25px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #38bdf8; }
        .badge { background: #0284c7; color: white; padding: 4px 12px; border-radius: 999px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">ZONA DMZ PÚBLICA</span>
        <h1>Servidor Web Nginx Frontal</h1>
        <p>IP: <code>172.20.0.10:80</code></p>
        <p>Este servidor es accesible por el cliente externo gracias a la regla de Firewall UFW.</p>
    </div>
</body>
</html>
`,
  },
  {
    name: 'nginx-internal/default.conf',
    path: 'nginx-internal/default.conf',
    language: 'nginx',
    description: 'Configuración del microservicio de API interna en puerto 8080.',
    content: `server {
    listen 8080;
    server_name localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        default_type application/json;
    }
}
`,
  },
  {
    name: 'nginx-internal/html/index.html',
    path: 'nginx-internal/html/index.html',
    language: 'json',
    description: 'Respuesta JSON confidencial servida por la API interna.',
    content: `{
  "status": "success",
  "zone": "INTERNAL_SECURE_NETWORK",
  "ip": "172.30.0.20:8080",
  "message": "Bienvenido a la API de datos interna. Acceso restringido autorizado.",
  "timestamp": "2026-09-03T00:00:00Z"
}
`,
  },
  {
    name: 'iniciar-laboratorio.bat',
    path: 'iniciar-laboratorio.bat',
    language: 'bat',
    description: 'Script por lotes de Windows para levantar el laboratorio con 1 solo clic en Windows.',
    content: `@echo off
echo ========================================================
echo   Iniciando Laboratorio de Firewall con Docker Desktop
echo ========================================================
echo Verificando Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no esta instalado o no se encuentra en el PATH.
    echo Asegurate de abrir Docker Desktop para Windows primero.
    pause
    exit /b 1
)

echo Levantando contenedores y redes segmentadas...
docker compose up -d --build

echo.
echo ========================================================
echo  Laboratorio desplegado exitosamente!
echo ========================================================
echo  - Firewall IP DMZ:      172.20.0.254
echo  - Firewall IP Interna:  172.30.0.254
echo  - Nginx Web DMZ:        172.20.0.10 (Localhost: http://localhost:8080)
echo  - Nginx API Interna:    172.30.0.20:8080 (Aislado)
echo  - Cliente de Pruebas:   172.20.0.50
echo.
echo Para probar el trafico, ejecuta en PowerShell:
echo   docker exec -it cliente-externo curl -I http://172.20.0.10
echo   docker exec -it cliente-externo curl --connect-timeout 3 http://172.30.0.20:8080
echo.
pause
`,
  },
  {
    name: 'iniciar-laboratorio.ps1',
    path: 'iniciar-laboratorio.ps1',
    language: 'powershell',
    description: 'Script PowerShell para Windows con menú interactivo de pruebas de red y firewall.',
    content: `# Script PowerShell de Automatización para el Laboratorio de Firewall
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Laboratorio de Firewall y Enrutamiento en Docker (WSL2)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

# Comprobar Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker Desktop no fue encontrado. Por favor inicia Docker Desktop."
    exit 1
}

Write-Host "Levantando contenedores y redes segmentadas..." -ForegroundColor Yellow
docker compose up -d --build

Write-Host ""
Write-Host "Verificando estado de los contenedores:" -ForegroundColor Cyan
docker ps --filter "name=ubuntu-firewall" --filter "name=nginx" --filter "name=cliente"

Write-Host ""
Write-Host "[Prueba 1] Cliente externo accede a Web DMZ (172.20.0.10:80):" -ForegroundColor Green
docker exec cliente-externo curl -s -I http://172.20.0.10 | Select-String "HTTP"

Write-Host ""
Write-Host "[Prueba 2] Cliente externo intenta acceder a API Interna (172.30.0.20:8080):" -ForegroundColor Red
Write-Host "Esperando resultado de bloqueo UFW..." -ForegroundColor Gray
docker exec cliente-externo curl -s --connect-timeout 3 http://172.30.0.20:8080 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "BLOQUEADO CORRECTAMENTE: El Firewall descartó la conexión del cliente externo." -ForegroundColor Green
}

Write-Host ""
Write-Host "[Prueba 3] Nginx DMZ consulta la API Interna (172.30.0.20:8080):" -ForegroundColor Green
docker exec nginx-web-dmz curl -s http://172.30.0.20:8080

Write-Host ""
Write-Host "[Prueba 4] Estado actual de reglas en el Firewall:" -ForegroundColor Cyan
docker exec ubuntu-firewall ufw status verbose
`,
  },
  {
    name: 'GUIA_PASO_A_PASO.md',
    path: 'GUIA_PASO_A_PASO.md',
    language: 'markdown',
    description: 'Guía teórica y práctica completa para estudiantes y principiantes en redes y ciberseguridad.',
    content: `# Guía de Estudio: Firewall y Enrutamiento Segmentado con Docker y UFW

## 1. ¿Qué es la Segmentación de Red?
La segmentación de red consiste en dividir una red informática en subredes más pequeñas y aisladas. El objetivo principal es limitar el radio de impacto (*blast radius*) en caso de que un atacante comprometa un servidor público.

## 2. Topología de este Laboratorio
- **Zona DMZ (172.20.0.0/24)**: Zona Desmilitarizada. Alberga servicios que deben ser visibles desde el exterior, como el servidor Nginx Web Frontal (\`172.20.0.10\`).
- **Zona Interna (172.30.0.0/24)**: Zona de alta seguridad. Alberga microservicios sensibles y bases de datos (\`172.30.0.20:8080\`).
- **Firewall Ubuntu (\`172.20.0.254\` / \`172.30.0.254\`)**: Dispositivo con doble tarjeta de red (*Dual-Homed*) que evalúa cada paquete antes de reenviarlo.

## 3. Comandos Esenciales de UFW
- \`ufw default deny incoming\`: Bloquea conexiones directas hacia el firewall.
- \`ufw default deny forward\`: Bloquea el tráfico que intente cruzar entre redes.
- \`ufw route allow in on eth0 out on eth1 to 172.30.0.20 port 8080 proto tcp\`: Permite que el tráfico cruce de la red DMZ a la red interna solo al puerto 8080.
- \`ufw status verbose\`: Muestra el estado y reglas detalladas.
`,
  },
];
