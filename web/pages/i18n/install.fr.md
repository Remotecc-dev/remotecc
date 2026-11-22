---
title: Installer RemoteCC — utilisez Claude Code sur mobile ou navigateur
description: Installez RemoteCC sur macOS, Linux ou Windows (WSL2) en une commande et pilotez Claude Code sur mobile ou navigateur. Versions signées, chiffrement E2E.
---
# Installer RemoteCC

RemoteCC vous permet d'utiliser Claude Code sur votre ordinateur depuis n'importe quel navigateur ou l'application iPhone. La connexion est chiffrée de bout en bout et rien n'est stocké dans le cloud.

RemoteCC est **open source (Apache-2.0)** : [github.com/Remotecc-dev/remotecc](https://github.com/Remotecc-dev/remotecc). Vous pouvez inspecter l'installeur et le pont avant d'exécuter quoi que ce soit. Chaque version est signée et l'installeur refuse tout fichier dont la signature ne correspond pas.

## Prérequis
- macOS, Linux ou Windows avec WSL2 (voir « Sur Windows » ci-dessous).
- Claude Code installé et connecté sur cet ordinateur (`claude --version` fonctionne).
- Python 3 (macOS : `xcode-select --install` · Ubuntu : `sudo apt install python3 python3-venv`).

## 1. Installer
Exécutez ceci dans un terminal sur l'ordinateur qui exécute Claude Code :

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

Ce que fait le script :
- télécharge le pont signé dans `~/.remotecc/app` et vérifie la signature ;
- crée un environnement Python dédié ;
- démarre le pont en arrière-plan (un LaunchAgent sur macOS, un service utilisateur systemd sur Linux et WSL). Vous le gérez avec la commande `remotecc`.

Il se termine par `RemoteCC running` et un bloc **Next step**.

Vous préférez laisser Claude s'en charger ? Collez ceci dans Claude Code : `Installe RemoteCC sur cet ordinateur en suivant https://remotecc.dev/install.md, puis explique-moi comment l'appairer.`

## 2. Appairer un navigateur ou un téléphone
- **Navigateur sur cet ordinateur :** ouvrez [remotecc.dev](https://remotecc.dev/), ou actualisez la page si elle est déjà ouverte. L'appairage avec cet ordinateur est automatique. Dans Safari, cliquez une fois sur "Connect RemoteCC on this Mac" (Connecter RemoteCC sur ce Mac).
- **Téléphone ou autre ordinateur :** exécutez `remotecc pair` dans un terminal sur cet ordinateur. Un QR code s'affiche. Scannez-le avec l'appareil photo de l'iPhone ou avec "Scan QR code" (Scanner le QR code) sur remotecc.dev.
- **Autre ordinateur sur le même tailnet Tailscale :** ouvrez remotecc.dev sur cet autre ordinateur, choisissez "Over Tailscale" (Via Tailscale), sélectionnez cet ordinateur, puis saisissez le code à 4 chiffres affiché sur cette page dans la boîte de dialogue RemoteCC sur cet ordinateur.

## Sur Windows
RemoteCC s'exécute dans WSL2 (Ubuntu) :
1. Dans PowerShell : `wsl --install -d Ubuntu`, puis ouvrez Ubuntu.
2. Installez Claude Code dans Ubuntu et connectez-vous.
3. Dans Ubuntu, exécutez la commande d'installation ci-dessus.

Une fois terminé, votre navigateur Windows ouvre remotecc.dev déjà appairé. Guide complet (en anglais) : [Guide Windows](/windows).

## Commandes utiles
`remotecc status` · `remotecc devices` · `remotecc settings` · `remotecc uninstall`

Les mises à jour s'installent automatiquement (signées par RemoteCC) lorsqu'aucune tâche n'est en cours. Désactivez cette option avec `remotecc settings auto-update off`.
