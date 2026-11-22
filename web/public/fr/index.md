# RemoteCC : la télécommande de vos agents de code

Exécutez Claude Code et Codex sur votre propre ordinateur et pilotez-les depuis votre téléphone, votre tablette ou n'importe quel navigateur. Chiffrement de bout en bout, sans compte, rien stocké dans le cloud. Gratuit et open source (Apache-2.0).

## Ce que vous obtenez
- **Contrôle à distance de Claude Code** : démarrez, suivez et répondez aux sessions en direct. Sorties, validations, fichiers et images dans une interface de chat épurée.
- **Suivi de votre consommation Claude** : quotas restants sur les fenêtres de 5 heures et hebdomadaire avec heures de réinitialisation, ainsi que les tokens et le coût par session.
- **État de votre ordinateur** : RAM utilisée, température du CPU et espace disque disponible sur la machine qui exécute Claude Code.
- **Travail en parallèle** : sessions enfants et branches, questions annexes avec **btw**, et réponses d'un signe de tête ou d'un doigt levé.
- **Confidentialité par conception** : chiffrement de bout en bout (X25519 + AES-256-GCM), relais aveugle, versions signées. Votre code et vos échanges restent sur votre propre ordinateur.
- **macOS, Linux, Windows** : une seule commande pour l'installer. Sur Windows, l'exécution passe par WSL2.

## Installation en une minute
Le plus simple : collez ceci dans votre session Claude Code actuelle et laissez-le installer RemoteCC pour vous :

```
Installe RemoteCC sur cet ordinateur en suivant https://remotecc.dev/install.md, puis explique-moi comment l'appairer.
```

Ou lancez-le vous-même dans un terminal sur l'ordinateur qui exécute Claude Code :

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

RemoteCC tourne ensuite en arrière-plan sur cet ordinateur (rien dans la barre de menus ni dans le Dock). Guide étape par étape : [Installer RemoteCC](install).

## Appairer votre téléphone ou navigateur
- **Navigateur sur le même ordinateur :** ouvrez [remotecc.dev](https://remotecc.dev/). L'appairage est automatique.
- **Téléphone ou autre ordinateur :** exécutez `remotecc pair` dans un terminal sur cet ordinateur, puis scannez le QR code avec l'appareil photo de votre téléphone.
- **Application iPhone et iPad :** [RemoteCC sur l'App Store](https://apps.apple.com/app/id6797019430).

L'interface de l'application web est en anglais ; vos sessions, bien sûr, se déroulent dans la langue dans laquelle vous écrivez à Claude.

## FAQ
**Mon code ou mes conversations passent-ils par un serveur ?** Non. Votre appareil et votre ordinateur communiquent avec un chiffrement de bout en bout. Le relais qui les connecte ne fait que transmettre des données chiffrées sans rien stocker ; sur le même Wi-Fi ou via Tailscale, la connexion est directe.

**RemoteCC est-il gratuit ?** Oui. Le pont, l'application web et le relais sont gratuits et open source. Vous utilisez votre propre abonnement Claude ou votre clé API avec Claude Code.

**Faut-il créer un compte ?** Non. Appairer un navigateur avec votre ordinateur suffit.

**Sur quels ordinateurs cela fonctionne-t-il ?** macOS, Linux et Windows via WSL2. Claude Code doit être installé et connecté sur cet ordinateur.

**Est-ce développé par Anthropic ?** Non. RemoteCC est un projet open source indépendant. Claude et Claude Code sont des marques déposées d'Anthropic.

---
RemoteCC · https://remotecc.dev/fr/ · open source: https://github.com/Remotecc-dev/remotecc
