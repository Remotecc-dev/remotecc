# RemoteCC: el control remoto para tus agentes de programación

Ejecuta Claude Code y Codex en tu propio equipo y contrólalos desde tu teléfono, tablet o cualquier navegador. Cifrado de extremo a extremo, sin cuenta y sin guardar nada en la nube. Gratuito y de código abierto (Apache-2.0).

## Qué incluye
- **Control remoto para Claude Code**: inicia, sigue y responde sesiones en tiempo real. Salida, aprobaciones, archivos e imágenes en una sola vista de chat limpia.
- **Uso de Claude de un vistazo**: límites restantes de tu plan en las ventanas de 5 horas y semanal con sus horarios de reinicio, además de tokens y costo por sesión.
- **Estado de tu equipo**: RAM en uso, temperatura de la CPU y espacio libre en disco de la máquina donde corre Claude Code.
- **Trabaja en paralelo**: sesiones secundarias y ramas, consultas rápidas al margen con **btw**, y responde asintiendo con la cabeza o levantando un dedo.
- **Privado por diseño**: cifrado de extremo a extremo (X25519 + AES-256-GCM), relay ciego y versiones firmadas. Tu código y tus chats permanecen en tu propio equipo.
- **macOS, Linux, Windows**: se instala con un solo comando. En Windows funciona mediante WSL2.

## Instala en un minuto
La forma más sencilla: pega esto en tu sesión actual de Claude Code y deja que instale RemoteCC por ti:

```
Instala RemoteCC en este equipo siguiendo https://remotecc.dev/install.md y luego dime cómo emparejarlo.
```

O ejecútalo tú mismo en una terminal del equipo donde corre Claude Code:

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

RemoteCC quedará ejecutándose en segundo plano en ese equipo (sin nada en la barra de menús ni en el Dock). Guía paso a paso: [Instalar RemoteCC](install).

## Empareja tu teléfono o navegador
- **Navegador en el mismo equipo:** abre [remotecc.dev](https://remotecc.dev/). Se empareja automáticamente.
- **Teléfono u otro equipo:** ejecuta `remotecc pair` en una terminal de ese equipo y escanea el código QR con la cámara de tu teléfono.
- **App para iPhone y iPad:** [RemoteCC en el App Store](https://apps.apple.com/app/id6797019430).

La interfaz de la app web está en inglés; tus sesiones, por supuesto, van en el idioma en que le escribas a Claude.

## Preguntas frecuentes
**¿Mi código o mis chats pasan por algún servidor?** No. Tu dispositivo y tu equipo se comunican con cifrado de extremo a extremo. El relay que los conecta solo reenvía texto cifrado y no almacena nada; en la misma red Wi-Fi o en Tailscale se conectan directamente.

**¿RemoteCC es gratis?** Sí. El puente, la app web y el relay son gratuitos y de código abierto. Usas tu propio plan de Claude o tu clave API con Claude Code.

**¿Necesito una cuenta?** No. Emparejar un navegador con tu equipo es todo lo que hace falta.

**¿En qué equipos funciona?** macOS, Linux y Windows a través de WSL2. Claude Code debe estar instalado y con sesión iniciada en ese equipo.

**¿Lo hace Anthropic?** No. RemoteCC es un proyecto independiente de código abierto. Claude y Claude Code son marcas registradas de Anthropic.

---
RemoteCC · https://remotecc.dev/es/ · open source: https://github.com/Remotecc-dev/remotecc
