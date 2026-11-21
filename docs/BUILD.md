# Gerar instaladores (APK e IPA) pelo GitHub Actions

Workflow: `.github/workflows/build-instaladores.yml`

## Como rodar

- **Manual:** GitHub → aba **Actions** → *Gerar instaladores (APK e IPA)* → **Run workflow**.
  Os arquivos ficam em **Artifacts** no fim da execução (`android-apk` e `ios-ipa`).
- **Por versão:** crie e envie uma tag — os arquivos também vão para uma **Release**:
  ```bash
  git tag v1.0.0 && git push origin v1.0.0
  ```

Funciona **sem configurar nada**:

| Plataforma | Sem secrets | Com secrets |
|---|---|---|
| Android | APK assinado com chave de debug — instala em qualquer Android | APK assinado com sua keystore (pronto para distribuir/Play Store) |
| iOS | IPA **sem assinatura** — precisa ser assinado (Sideloadly, AltStore) para instalar | IPA assinado (ad-hoc, app-store ou development) |

> A Apple não permite instalar IPA sem assinatura. Para um IPA instalável direto
> é obrigatório ter uma conta **Apple Developer** (US$ 99/ano).

## Secrets (Settings → Secrets and variables → Actions)

### Android (opcional)

1. Gere a keystore uma única vez (guarde o arquivo e as senhas — sem ela não dá para atualizar o app na Play Store):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore \
     -alias assistencia -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Converta para base64:
   - Linux/macOS: `base64 -i release.keystore | tr -d '\n'`
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore"))`

| Secret | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | conteúdo base64 da keystore |
| `ANDROID_KEYSTORE_PASSWORD` | senha da keystore |
| `ANDROID_KEY_ALIAS` | alias (ex.: `assistencia`) |
| `ANDROID_KEY_PASSWORD` | senha da chave |

### iOS (opcional, precisa de conta Apple Developer)

No portal developer.apple.com:
1. Registre o App ID `com.assistenciaml.app`.
2. Crie um certificado **Apple Distribution** e exporte como `.p12` (Keychain Access → Exportar).
3. Crie um **Provisioning Profile** do tipo *Ad Hoc* (com os UDIDs dos iPhones que vão instalar) ou *App Store*.

| Secret | Valor |
|---|---|
| `IOS_P12_BASE64` | certificado `.p12` em base64 |
| `IOS_P12_PASSWORD` | senha do `.p12` |
| `IOS_PROVISION_PROFILE_BASE64` | arquivo `.mobileprovision` em base64 |
| `IOS_TEAM_ID` | Team ID (10 caracteres, em Membership) |

Ao rodar manualmente, escolha o tipo de IPA (`ad-hoc`, `app-store` ou `development`) — deve
corresponder ao tipo do provisioning profile.

## Versão

A versão do arquivo vem de `expo.version` no `app.json`. Para publicar nas lojas,
aumente também `android.versionCode` / `ios.buildNumber` a cada envio.
