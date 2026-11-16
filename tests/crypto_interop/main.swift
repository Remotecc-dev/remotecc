// Swift half of the RemoteCC wire-crypto interop test (driven by tests/crypto_interop/run.sh with bridge/tunnel.py).
import CryptoKit
import Foundation

// "@path" arguments are read from that file (frames can be megabytes).
let a = CommandLine.arguments.map { $0.hasPrefix("@") ? ((try? String(contentsOfFile: String($0.dropFirst()), encoding: .utf8)) ?? "") : $0 }
func out(_ o: [String: Any]) { print(TunnelCrypto.json(o)) }
switch a[1] {
case "seal":   // seal <macPub> <text> → new device key + frame
    let priv = Curve25519.KeyAgreement.PrivateKey()
    let devPub = TunnelCrypto.b64u(priv.publicKey.rawRepresentation), devPriv = TunnelCrypto.b64u(priv.rawRepresentation)
    let k = try TunnelCrypto.sessionKey(devPriv: devPriv, macPub: a[2])
    out(["devPriv": devPriv, "devPub": devPub, "frame": try TunnelCrypto.seal(k, ["text": a[3]]),
         "check": TunnelCrypto.checkCode(macPub: a[2], devPub: devPub)])
case "open":   // open <devPriv> <macPub> <frame> → plaintext
    let k = try TunnelCrypto.sessionKey(devPriv: a[2], macPub: a[3])
    out(try TunnelCrypto.open(k, a[4]))
case "tamper":   // tamper <devPriv> <macPub> <frame> → must fail
    let k = try TunnelCrypto.sessionKey(devPriv: a[2], macPub: a[3])
    var raw = Data(base64Encoded: a[4])!
    raw[raw.count - 1] ^= 1
    out(["ok": (try? TunnelCrypto.open(k, raw.base64EncodedString())) != nil])
case "parse":
    let q = TunnelCrypto.parse(a[2])
    out(["ok": q != nil, "room": q?.room ?? "", "k": q?.k ?? "", "c": q?.c ?? "", "n": q?.n ?? ""])
default: break
}
