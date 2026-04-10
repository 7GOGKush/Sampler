#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# install.sh — Build & sideload Globe TV onto an Onn Android TV box
#
# Prerequisites:
#   - Android SDK / Android Studio installed
#   - adb in your PATH  (brew install android-platform-tools  OR
#                         apt install adb)
#   - Onn device: Settings > Device Preferences > Security & Restrictions >
#                 Unknown Sources  →  ON
#   - Onn device: Settings > Device Preferences > Developer Options >
#                 USB Debugging  →  ON  (for direct ADB connection)
#
# Usage:
#   chmod +x install.sh
#   ./install.sh               # build debug APK and install over USB/WiFi
#   ./install.sh <DEVICE_IP>   # install wirelessly (ADB over WiFi)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APK_PATH="$SCRIPT_DIR/app/build/outputs/apk/debug/app-debug.apk"
DEVICE_IP="${1:-}"

# ── 1. Build the debug APK ────────────────────────────────────────────────────
echo "=> Building Globe TV APK…"
cd "$SCRIPT_DIR"

if [ ! -f "./gradlew" ]; then
    echo "ERROR: gradlew not found."
    echo "  Open this folder in Android Studio once — it will generate gradlew."
    echo "  Then re-run this script."
    exit 1
fi

chmod +x ./gradlew
./gradlew assembleDebug --quiet

if [ ! -f "$APK_PATH" ]; then
    echo "ERROR: Build succeeded but APK not found at:"
    echo "  $APK_PATH"
    exit 1
fi

echo "   APK built: $APK_PATH"

# ── 2. Connect to device ──────────────────────────────────────────────────────
if [ -n "$DEVICE_IP" ]; then
    echo "=> Connecting to Onn at $DEVICE_IP:5555 (ADB over WiFi)…"
    adb connect "$DEVICE_IP:5555"
    sleep 2
fi

# ── 3. Check ADB sees the device ─────────────────────────────────────────────
if ! adb devices | grep -qE '(device|recovery)$'; then
    echo ""
    echo "ERROR: No ADB device found."
    echo "  USB:  Connect Onn via USB and enable USB Debugging in Developer Options."
    echo "  WiFi: Run:  ./install.sh <ONN_IP_ADDRESS>"
    echo "        (find IP at Settings > Device Preferences > About > Status)"
    exit 1
fi

# ── 4. Install APK ───────────────────────────────────────────────────────────
echo "=> Installing Globe TV on Onn…"
adb install -r "$APK_PATH"
echo ""
echo "✓  Globe TV installed successfully!"
echo "   Find it in Apps > See all apps, or add it to the home row."
echo ""

# ── 5. (Optional) Launch immediately ─────────────────────────────────────────
read -rp "Launch Globe TV now? [y/N] " launch
if [[ "$launch" =~ ^[Yy]$ ]]; then
    adb shell am start -n "com.globetv.onn.debug/.MainActivity"
fi
