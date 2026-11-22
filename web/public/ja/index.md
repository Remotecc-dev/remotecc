# RemoteCC：コーディングエージェントをスマホ・ブラウザから操作

自分の PC で動かしている Claude Code や Codex を、スマホ・タブレット・任意のブラウザから操作できます。エンドツーエンド暗号化、アカウント不要、クラウドへの保存なし。無料のオープンソース（Apache-2.0）です。

## 主な機能
- **Claude Code をリモート操作**：セッションの開始・確認・返信をリアルタイムで実行。出力、承認、ファイル、画像をすっきりしたチャット画面に集約します。
- **Claude の使用量をひと目で確認**：5 時間枠・週間枠の残り上限とリセット時刻に加え、セッションごとのトークン数とコストを表示します。
- **PC の状態を把握**：Claude Code を動かしているマシンの RAM 使用量、CPU 温度、ディスク空き容量を確認できます。
- **並列作業に対応**：子セッションやブランチ、**btw** でのちょっとした横質問に対応し、うなずきや指を立てるジェスチャーでも応答できます。
- **プライバシー重視の設計**：エンドツーエンド暗号化（X25519 + AES-256-GCM）、ブラインドリレー、署名済みリリースを採用。コードもチャットも自分の PC から外に保存されません。
- **macOS・Linux・Windows 対応**：コマンド 1 行でインストール。Windows では WSL2 上で動作します。

## 1 分でインストール
一番簡単な方法は、いま開いている Claude Code のセッションに以下を貼り付けて、RemoteCC のインストールを任せることです：

```
https://remotecc.dev/install.md の手順に従ってこのコンピューターに RemoteCC をインストールし、ペアリング方法を教えてください。
```

または、Claude Code を動かしている PC のターミナルで直接実行します：

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

インストール後、RemoteCC はその PC のバックグラウンドで動作します（メニューバーや Dock には表示されません）。詳しい手順：[RemoteCC のインストール](install)。

## スマホやブラウザをペアリング
- **同じ PC のブラウザ：** [remotecc.dev](https://remotecc.dev/) を開くだけで自動的にペアリングされます。
- **スマホや別の PC：** その PC のターミナルで `remotecc pair` を実行し、表示された QR コードをスマホのカメラで読み取ります。
- **iPhone・iPad アプリ：** [App Store の RemoteCC](https://apps.apple.com/app/id6797019430)。

Web アプリの UI は英語ですが、Claude とのやり取りはもちろん普段使っている言語でそのまま行えます。

## よくある質問
**コードやチャット内容がサーバーを経由しますか？** いいえ。お使いの端末と PC の間はエンドツーエンドで暗号化されます。接続を仲介するリレーは暗号文を転送するだけで一切保存せず、同じ Wi-Fi や Tailscale 上では直接接続します。

**RemoteCC は無料ですか？** はい。ブリッジ、Web アプリ、リレーはすべて無料のオープンソースです。Claude Code ではご自身の Claude プランまたは API キーを利用します。

**アカウント登録は必要ですか？** 不要です。ブラウザと PC をペアリングするだけですぐに使えます。

**対応している PC は？** macOS、Linux、および WSL2 経由の Windows に対応しています。その PC に Claude Code がインストールされ、サインイン済みである必要があります。

**Anthropic の公式ツールですか？** いいえ。RemoteCC は独立したオープンソースプロジェクトです。Claude および Claude Code は Anthropic の商標です。

---
RemoteCC · https://remotecc.dev/ja/ · open source: https://github.com/Remotecc-dev/remotecc
