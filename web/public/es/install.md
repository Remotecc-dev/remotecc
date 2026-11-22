# Instalar RemoteCC

RemoteCC te permite usar Claude Code en tu equipo desde cualquier navegador o desde la app de iPhone. La conexión está cifrada de extremo a extremo y no se guarda nada en la nube.

RemoteCC es **de código abierto (Apache-2.0)**: [github.com/Remotecc-dev/remotecc](https://github.com/Remotecc-dev/remotecc). Puedes revisar el instalador y el puente allí antes de ejecutar nada. Cada versión está firmada y el instalador rechaza los archivos cuya firma no coincida.

## Requisitos
- macOS, Linux o Windows con WSL2 (consulta "En Windows" más abajo).
- Claude Code instalado y con sesión iniciada en este equipo (`claude --version` funciona).
- Python 3 (macOS: `xcode-select --install` · Ubuntu: `sudo apt install python3 python3-venv`).

## 1. Instalar
Ejecuta esto en una terminal del equipo donde corre Claude Code:

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

Qué hace:
- descarga el puente firmado en `~/.remotecc/app` y verifica la firma;
- crea un entorno privado de Python;
- inicia el puente en segundo plano (un LaunchAgent en macOS, un servicio de usuario de systemd en Linux y WSL). Puedes gestionarlo con el comando `remotecc`.

Termina mostrando `RemoteCC running` y un bloque **Next step**.

¿Prefieres que lo haga Claude? Pega esto en Claude Code: `Instala RemoteCC en este equipo siguiendo https://remotecc.dev/install.md y luego dime cómo emparejarlo.`

## 2. Emparejar un navegador o teléfono
- **Navegador en este equipo:** abre [remotecc.dev](https://remotecc.dev/) o recarga la página si ya está abierta. Se empareja automáticamente con este equipo. En Safari, haz clic una vez en "Connect RemoteCC on this Mac" (Conectar RemoteCC en este Mac).
- **Teléfono u otro equipo:** ejecuta `remotecc pair` en una terminal de este equipo. Aparecerá un código QR. Escanéalo con la Cámara del iPhone o con "Scan QR code" (Escanear código QR) en remotecc.dev.
- **Otro equipo en la misma tailnet de Tailscale:** abre remotecc.dev ahí, elige "Over Tailscale" (Por Tailscale), selecciona este equipo y luego escribe el código de 4 dígitos de esa página en el diálogo de RemoteCC en este equipo.

## En Windows
RemoteCC se ejecuta dentro de WSL2 (Ubuntu):
1. En PowerShell: `wsl --install -d Ubuntu`, luego abre Ubuntu.
2. Instala Claude Code dentro de Ubuntu e inicia sesión.
3. En Ubuntu, ejecuta el comando de instalación de arriba.

Al terminar, tu navegador de Windows abrirá remotecc.dev ya emparejado. Guía completa (en inglés): [Guía para Windows](/windows).

## Comandos útiles
`remotecc status` · `remotecc devices` · `remotecc settings` · `remotecc uninstall`

Las actualizaciones se instalan automáticamente (firmadas por RemoteCC) cuando no hay ninguna tarea en ejecución. Desactívalo con `remotecc settings auto-update off`.

---
RemoteCC · https://remotecc.dev/es/install · open source: https://github.com/Remotecc-dev/remotecc
