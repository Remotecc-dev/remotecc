# RemoteCC のインストール

RemoteCC を使うと、PC 上の Claude Code を任意のブラウザや iPhone アプリから操作できます。通信はエンドツーエンドで暗号化され、クラウドには何も保存されません。

RemoteCC は **オープンソース（Apache-2.0）** です：[github.com/Remotecc-dev/remotecc](https://github.com/Remotecc-dev/remotecc)。実行前にインストーラーやブリッジのコードを確認できます。すべてのリリースには署名が付いており、署名が一致しないファイルはインストーラーが拒否します。

## 動作要件
- macOS、Linux、または WSL2 を有効にした Windows（下の「Windows の場合」を参照）。
- この PC に Claude Code がインストールされ、サインイン済みであること（`claude --version` が動作すること）。
- Python 3（macOS：`xcode-select --install` · Ubuntu：`sudo apt install python3 python3-venv`）。

## 1. インストール
Claude Code を動かしている PC のターミナルで以下を実行します：

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

実行内容：
- 署名済みのブリッジを `~/.remotecc/app` にダウンロードし、署名を検証します。
- 専用の Python 環境を作成します。
- ブリッジをバックグラウンドで起動します（macOS では LaunchAgent、Linux と WSL では systemd ユーザーサービス）。管理には `remotecc` コマンドを使います。

完了すると `RemoteCC running` と **Next step** ブロックが表示されます。

Claude に任せたい場合は、Claude Code に次を貼り付けてください：`https://remotecc.dev/install.md の手順に従ってこのコンピューターに RemoteCC をインストールし、ペアリング方法を教えてください。`

## 2. ブラウザやスマホをペアリング
- **この PC のブラウザ：** [remotecc.dev](https://remotecc.dev/) を開くか、すでに開いている場合は再読み込みします。自動的にこの PC とペアリングされます。Safari では初回のみ "Connect RemoteCC on this Mac"（この Mac の RemoteCC に接続）をクリックしてください。
- **スマホや別の PC：** この PC のターミナルで `remotecc pair` を実行すると QR コードが表示されます。iPhone のカメラ、または remotecc.dev の "Scan QR code"（QR コードをスキャン）で読み取ってください。
- **同じ Tailscale tailnet 上の別 PC：** そちらで remotecc.dev を開いて "Over Tailscale"（Tailscale 経由）を選び、この PC を指定します。表示された 4 桁のコードを、この PC 側の RemoteCC ダイアログに入力してください。

## Windows の場合
RemoteCC は WSL2（Ubuntu）上で動作します：
1. PowerShell で `wsl --install -d Ubuntu` を実行し、Ubuntu を開きます。
2. Ubuntu 内に Claude Code をインストールしてサインインします。
3. Ubuntu 内で上記のインストールコマンドを実行します。

完了すると、Windows のブラウザでペアリング済みの remotecc.dev が開きます。詳しいガイド（英語）：[Windows ガイド](/windows)。

## よく使うコマンド
`remotecc status` · `remotecc devices` · `remotecc settings` · `remotecc uninstall`

タスクが実行されていないときに、RemoteCC の署名付きアップデートが自動でインストールされます。無効にするには `remotecc settings auto-update off` を実行してください。

---
RemoteCC · https://remotecc.dev/ja/install · open source: https://github.com/Remotecc-dev/remotecc
