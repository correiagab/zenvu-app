#!/usr/bin/env bash
# Builds an UNSIGNED Zenvu.ipa (needs Xcode). Sign + install it with Sideloadly or AltStore using your Apple ID.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! xcodebuild -version >/dev/null 2>&1; then
  echo "❌ Xcode não está instalado (ou não está selecionado)."
  echo "   1) Instala o Xcode pela App Store"
  echo "   2) Corre: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  exit 1
fi

npm run build
npx cap sync ios

rm -rf build/ios build/Payload build/Zenvu.ipa
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath build/ios \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  build | grep -E "error:|warning: |BUILD" || true

APP=build/ios/Build/Products/Release-iphoneos/App.app
[ -d "$APP" ] || { echo "❌ Build falhou"; exit 1; }

mkdir -p build/Payload
cp -R "$APP" build/Payload/
(cd build && zip -qry Zenvu.ipa Payload && rm -rf Payload)
echo "✅ IPA criado: $(pwd)/build/Zenvu.ipa"
