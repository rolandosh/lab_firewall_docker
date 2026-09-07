import JSZip from 'jszip';
import { DOCKER_PROJECT_FILES } from '../data/dockerProjectFiles';
import { UfwConfig } from '../types';

export async function generateProjectZip(customUfwConfig?: UfwConfig): Promise<Blob> {
  const zip = new JSZip();

  // Root folder in zip for clean extraction
  const rootFolder = zip.folder('laboratorio-firewall-windows') || zip;

  // Add standard project files from DOCKER_PROJECT_FILES
  for (const file of DOCKER_PROJECT_FILES) {
    rootFolder.file(file.path, file.content);
  }

  // If custom UFW rules exist, optionally generate an updated entrypoint.sh with the user's custom rules!
  if (customUfwConfig && customUfwConfig.rules.length > 0) {
    const customEntrypoint = `#!/bin/bash
set -e

echo "============================================="
echo "   Iniciando Firewall Ubuntu con UFW...     "
echo "============================================="

# 1. Habilitar Reenvio IP en el Kernel
echo ${customUfwConfig.ipForwardingEnabled ? '1' : '0'} > /proc/sys/net/ipv4/ip_forward

# 2. Iniciar servicio de logs si esta disponible
service rsyslog start 2>/dev/null || true

# 3. Restablecer UFW a estado limpio
ufw --force reset

# 4. Politicas por defecto
ufw default ${customUfwConfig.defaultIncoming} incoming
ufw default ${customUfwConfig.defaultOutgoing} outgoing
ufw default ${customUfwConfig.defaultForward} forward

# 5. Reglas configuradas en el laboratorio
${customUfwConfig.rules
  .filter((r) => r.enabled)
  .map((r) => {
    let cmd = 'ufw ';
    if (r.direction === 'ROUTE' || r.isRouted) {
      cmd += 'route ';
    }
    cmd += r.action.toLowerCase() + ' ';
    if (r.inInterface) cmd += `in on ${r.inInterface} `;
    if (r.outInterface) cmd += `out on ${r.outInterface} `;
    if (r.fromIp && r.fromIp !== 'Anywhere' && r.fromIp !== '0.0.0.0/0') {
      cmd += `from ${r.fromIp} `;
    }
    if (r.toIp && r.toIp !== 'Anywhere') {
      cmd += `to ${r.toIp} `;
    }
    if (r.toPort) {
      cmd += `port ${r.toPort} `;
    }
    if (r.protocol && r.protocol !== 'any') {
      cmd += `proto ${r.protocol} `;
    }
    if (r.comment) {
      cmd += `comment "${r.comment}"`;
    }
    return `# Regla [${r.number}]: ${r.comment || ''}\n${cmd.trim()}`;
  })
  .join('\n\n')}

# 6. Activar UFW
${customUfwConfig.enabled ? 'ufw --force enable' : '# ufw desactivado en configuracion'}

echo "---------------------------------------------"
echo "Firewall UFW listo con reglas aplicadas."
ufw status verbose
echo "---------------------------------------------"

# Mantener el contenedor activo
tail -f /dev/null
`;
    rootFolder.file('firewall/entrypoint.sh', customEntrypoint);
  }

  // Add a dedicated stop script for Windows
  rootFolder.file(
    'detener-laboratorio.bat',
    `@echo off
echo ========================================================
echo   Deteniendo Laboratorio de Firewall Docker...
echo ========================================================
docker compose down -v
echo.
echo Todos los contenedores y redes virtuales han sido eliminados.
pause
`
  );

  // Add automated test bat for Windows cmd
  rootFolder.file(
    'probar-firewall.bat',
    `@echo off
echo ========================================================
echo   Ejecutando Pruebas de Red y Filtrado de Firewall
echo ========================================================
echo.
echo [TEST 1] Cliente externo -> Web DMZ (172.20.0.10:80)...
docker exec cliente-externo curl -s -I http://172.20.0.10
echo.
echo [TEST 2] Cliente externo -> API Interna (172.30.0.20:8080) [Debe fallar/bloquear]...
docker exec cliente-externo curl -s --connect-timeout 3 http://172.30.0.20:8080
if %errorlevel% neq 0 (
    echo [OK] Acceso BLOQUEADO por UFW (Comportamiento Seguro)
) else (
    echo [ALERTA] Acceso permitido!
)
echo.
echo [TEST 3] Nginx DMZ -> API Interna (172.30.0.20:8080) [Debe funcionar]...
docker exec nginx-web-dmz curl -s http://172.30.0.20:8080
echo.
echo [TEST 4] Reglas activas de UFW:
docker exec ubuntu-firewall ufw status verbose
echo.
pause
`
  );

  // Add friendly README for Windows beginners
  rootFolder.file(
    'LEEME_WINDOWS.txt',
    `========================================================================
LABORATORIO DE FIREWALL & ENRUTAMIENTO SEGMENTADO PARA DOCKER DESKTOP
========================================================================

¡Bienvenido a tu laboratorio práctico de Redes y Ciberseguridad!

REQUISITOS EN WINDOWS:
1. Tener instalado Docker Desktop para Windows (con WSL 2 backend).
2. Asegurarse de que Docker Desktop esté en ejecución (ícono de la ballena verde).

COMO INICIAR EL LABORATORIO:
----------------------------
OPCIÓN A (La más fácil - 1 Clic):
  Haz doble clic en el archivo: "iniciar-laboratorio.bat"

OPCIÓN B (Desde PowerShell):
  Abre PowerShell en esta carpeta y ejecuta:
  .\\iniciar-laboratorio.ps1

OPCIÓN C (Comandos manuales en terminal):
  docker compose up -d --build

COMO PROBAR EL FIREWALL:
------------------------
- Haz doble clic en "probar-firewall.bat" para ejecutar las pruebas automáticas.
- O ingresa a la consola del Firewall con:
  docker exec -it ubuntu-firewall bash
  ufw status verbose

COMO DETENER Y LIMPIAR:
-----------------------
- Haz doble clic en "detener-laboratorio.bat"

¡Disfruta practicando reglas de UFW y segmentación Zero-Trust!
`
  );

  // Generate the zip blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return zipBlob;
}

export async function downloadProjectZip(customUfwConfig?: UfwConfig, fileName = 'laboratorio-firewall-windows.zip') {
  const blob = await generateProjectZip(customUfwConfig);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
