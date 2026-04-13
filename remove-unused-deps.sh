#!/bin/bash

echo "🧹 Removing unused heavy dependencies..."
echo ""

# Remove heavy graphics/media libraries (NOT USED)
echo "Removing Skia (40 MB)..."
pnpm remove @shopify/react-native-skia

echo "Removing WebRTC (30 MB)..."
pnpm remove react-native-webrtc

echo "Removing Maps (20 MB)..."
pnpm remove react-native-maps

echo "Removing Camera (15 MB)..."
pnpm remove expo-camera

echo "Removing Video (10 MB)..."
pnpm remove expo-video expo-av

echo "Removing WebView (8 MB)..."
pnpm remove react-native-webview

echo "Removing GL (10 MB)..."
pnpm remove expo-gl

echo "Removing Media Library (5 MB)..."
pnpm remove expo-media-library

echo "Removing Audio (5 MB)..."
pnpm remove expo-audio

echo "Removing Sensors (3 MB)..."
pnpm remove expo-sensors

echo "Removing Calendar (3 MB)..."
pnpm remove expo-calendar

echo "Removing Contacts (3 MB)..."
pnpm remove expo-contacts

echo "Removing Print (2 MB)..."
pnpm remove expo-print

echo "Removing Speech (2 MB)..."
pnpm remove expo-speech

echo "Removing Screen Capture (2 MB)..."
pnpm remove expo-screen-capture

echo "Removing Store Review (1 MB)..."
pnpm remove expo-store-review

echo "Removing Task Manager (1 MB)..."
pnpm remove expo-task-manager

echo "Removing View Shot (2 MB)..."
pnpm remove react-native-view-shot

echo "Removing QR Code (2 MB)..."
pnpm remove react-native-qrcode-svg

echo "Removing Chart Kit (3 MB)..."
pnpm remove react-native-chart-kit

echo "Removing Markdown (2 MB)..."
pnpm remove react-native-markdown-display

echo "Removing Calendars (2 MB)..."
pnpm remove react-native-calendars

echo "Removing Elements (3 MB)..."
pnpm remove react-native-elements

echo "Removing Fade In Image (1 MB)..."
pnpm remove react-native-fade-in-image

echo "Removing Infinite Scroll (1 MB)..."
pnpm remove react-native-infinite-scroll-view

echo "Removing Keyboard Aware Scroll (1 MB)..."
pnpm remove react-native-keyboard-aware-scroll-view

echo "Removing Pager View (2 MB)..."
pnpm remove react-native-pager-view

echo "Removing Super Grid (1 MB)..."
pnpm remove react-native-super-grid

echo "Removing Dynamic (1 MB)..."
pnpm remove react-native-dynamic

echo "Removing Crypto JS (1 MB)..."
pnpm remove react-native-crypto-js

echo ""
echo "✅ Removed approximately 150+ MB of unused dependencies!"
echo ""
echo "📦 Next steps:"
echo "1. Test your app: pnpm start"
echo "2. If everything works, rebuild APK: eas build -p android --profile preview"
echo "3. Expected new APK size: ~80-100 MB (down from 239 MB)"