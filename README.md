# Zenvu

Finanças pessoais no estilo Revolut. Funciona como **web app (PWA)** e como **app iOS nativa** (Capacitor), com o mesmo código.
Os dados ficam só no dispositivo (localStorage). Há exportação e importação de cópia de segurança em Perfil.

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera a web app em dist/
```

## Web app

1. `npm run build`
2. Publica a pasta `dist/` em qualquer alojamento estático. Por exemplo, arrasta-a para https://app.netlify.com/drop, ou usa a Vercel (já tem `vercel.json`).
3. No iPhone, abre o link no **Safari** → Partilhar → **Adicionar ao ecrã principal**. Abre em ecrã inteiro e funciona offline.

## App iOS (IPA) com Apple ID gratuito

É preciso o **Xcode** (grátis na App Store). Com Apple ID gratuito, a app instalada expira ao fim de **7 dias**. Depois disso, basta reinstalar.

### Opção A: direto pelo Xcode (a mais simples)
1. `npm run ios:sync`
2. `npm run ios:open` (abre o projeto no Xcode)
3. Xcode → Settings → Accounts → adiciona o teu Apple ID.
4. Seleciona o target **App** → Signing & Capabilities → Team: *(o teu nome) Personal Team*.
   Se o Bundle Identifier der erro, muda-o para algo único, por exemplo `com.oteunome.zenvu`.
5. Liga o iPhone por cabo e escolhe-o no topo do Xcode. Depois carrega em ▶︎.
6. No iPhone: Definições → Privacidade e segurança → **Modo de programador** → ativar (o iPhone reinicia).
   Depois: Definições → Geral → VPN e gestão de dispositivos → confia no teu Apple ID.

### Opção B: gerar o ficheiro `.ipa` e instalar com o Sideloadly
1. `npm run ios:ipa` → cria `build/Zenvu.ipa` (não assinado).
2. Instala o [Sideloadly](https://sideloadly.io), liga o iPhone e arrasta o `Zenvu.ipa`.
   Inicia sessão com o Apple ID. O Sideloadly assina e instala a app.
3. Ativa o Modo de programador e confia no perfil (como no passo 6 acima).

### Opção C: gerar o IPA na nuvem (sem instalar o Xcode)
Faz push deste projeto para o GitHub. O workflow `.github/workflows/ios-ipa.yml` compila o IPA num Mac do GitHub.
Descarrega-o em *Actions → Build iOS IPA → Artifacts* e instala-o com o Sideloadly (opção B, passo 2).

## Estrutura

- `src/pages`: ecrãs (Início, Movimentos, Análises, Cofres, Assistente, Fixos, Perfil, Onboarding)
- `src/lib/finance.ts`: todos os cálculos (saldo, previsão, saúde financeira, sequência)
- `src/lib/store.ts`: dados persistidos
- `ios/`: projeto Xcode (Capacitor, Swift Package Manager, sem CocoaPods)
