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

## O APK fica em "Instalando…" e não instala

1. **Extraia o APK do .zip** baixado do GitHub (o artefato vem compactado) e abra o arquivo `.apk`.
2. **Desinstale a versão anterior** do app, se houver uma assinada com outra chave (ex.: build antigo com chave de debug). Android não instala por cima de um app com assinatura diferente.
3. **Play Protect**: se aparecer o aviso "App bloqueado/não verificado", toque em *Mais detalhes → Instalar mesmo assim*. Se travar em "Instalando…", abra a Play Store → foto do perfil → *Play Protect* → engrenagem e desative temporariamente a verificação, instale e reative.
4. **Assine com uma chave própria** (secrets `ANDROID_*` acima). APK assinado com a chave de debug pública é tratado com mais desconfiança pelo Play Protect.
5. **Verificação de desenvolvedor (Brasil)**: o Google passou a exigir, em aparelhos certificados no Brasil, que apps instalados fora da Play Store sejam de desenvolvedores verificados. Se o aparelho bloquear por esse motivo, cadastre-se no Android Developer Console (há opção gratuita para distribuição limitada) ou instale pelo computador com `adb install assistencia-ml.apk`, que não passa por essa verificação.

O `versionCode` é o número da execução do workflow, então cada APK novo instala por cima do anterior (desde que assinado com a mesma chave).

## Versão desktop (Windows)

A pasta `desktop/` empacota a versão web do app com o [Electron](https://www.electronjs.org/) e gera um instalador `.exe`. O mesmo workflow dos instaladores gera o APK, o IPA e o `.exe` (job **Windows (instalador .exe)**). Com uma tag `v*`, o instalador também vai para a Release como `assistencia-ml-<versão>-windows.exe`.

- Usa o mesmo login e os mesmos dados na nuvem que o celular.
- Com a janela larga (900 px ou mais), o app usa o **layout desktop**: menu lateral fixo (com Administração e Configurações), listas em grade, Painel em duas colunas, Nova venda no formato de caixa (produtos à esquerda, carrinho à direita) e efeito de hover. Com a janela estreita, volta ao layout do celular.
- Atalhos: **F2** nova OS · **F3** nova venda · **F4** novo cliente · **F6** agendar.
- **Imprimir** abre a janela de impressão do Windows. **Compartilhar PDF** salva o arquivo e o abre.
- Lembretes (notificações) e o compartilhamento direto para o WhatsApp existem só no celular.
- O instalador não tem assinatura digital. Na primeira instalação, o Windows pode mostrar "O Windows protegeu o computador": clique em **Mais informações → Executar assim mesmo**.

Para gerar no próprio computador:

```bash
npx expo export --platform web --output-dir desktop/app
cd desktop
npm install
npx electron-builder --win nsis    # instalador em desktop/dist/
```

Se o app fechar sozinho ao abrir pelo terminal do VS Code, remova a variável `ELECTRON_RUN_AS_NODE` antes (o VS Code a define). Para diagnosticar, abra com `ASSISTENCIA_DEBUG=C:\caminho\print.png`: o app grava um log e um print da tela.
