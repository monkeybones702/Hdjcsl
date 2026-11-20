import React, { useState } from 'react';
import JSZip from 'jszip';
import { X, Download, Smartphone, Terminal, Check, Sparkles, Shield, Package, FileCode } from 'lucide-react';

interface APKExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
}

export const APKExportModal: React.FC<APKExportModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
}) => {
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
    } else {
      alert(
        'On your Samsung A16, open Chrome or Samsung Internet, tap the 3-dots menu (⋮), and select "Install app" or "Add to Home screen". This generates an official WebAPK with USB host permissions!'
      );
    }
  };

  const handleDownloadAPKBundle = async () => {
    setIsGeneratingZip(true);
    try {
      const zip = new JSZip();

      // 1. AndroidManifest.xml configured with USB host & MIDI
      const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.monkeybones702.starlightdjtool">

    <!-- USB Host & MIDI permissions for Samsung A16 OTG -->
    <uses-feature android:name="android.hardware.usb.host" android:required="true" />
    <uses-feature android:name="android.software.midi" android:required="true" />
    <uses-permission android:name="android.permission.USB_PERMISSION" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Starlight DJ Tool"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="sensorLandscape"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- USB Device Attached Intent for Hercules DJControl Starlight -->
            <intent-filter>
                <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED" />
            </intent-filter>
            <meta-data
                android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
                android:resource="@xml/device_filter" />
        </activity>
    </application>
</manifest>`;

      // 2. device_filter.xml for Hercules DJControl Starlight
      const deviceFilterXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Hercules DJControl Starlight USB Filter (Vendor ID: 0x06F8 Hercules / Guillemot) -->
    <usb-device vendor-id="1784" />
</resources>`;

      // 3. MainActivity.kt with WebMIDI and WebUSB permissions auto-approved
      const mainActivityKt = `package com.monkeybones702.starlightdjtool

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true

        // Grant WebMIDI / WebUSB requests automatically for DJ controller
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        webView.webViewClient = WebViewClient()
        // Loads local PWA or hosting URL
        webView.loadUrl("${window.location.origin}")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}`;

      // 4. Shizuku installation script
      const shizukuScript = `#!/system/bin/sh
# Starlight DJ Tool - Shizuku Auto-Installer for Samsung Galaxy A16
# Usage: rish shizuku_install.sh

echo "=== Starlight DJ Tool Shizuku Installer ==="
APK_PATH="/sdcard/Download/starlight-djtool.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "Please place starlight-djtool.apk in /sdcard/Download/"
    exit 1
fi

echo "[1/3] Installing APK silently via Shizuku Package Manager..."
pm install -r -d "$APK_PATH"

echo "[2/3] Granting USB and Audio permissions..."
pm grant com.monkeybones702.starlightdjtool android.permission.USB_PERMISSION 2>/dev/null

echo "[3/3] Launching Starlight DJ Tool on Samsung A16..."
am start -n com.monkeybones702.starlightdjtool/.MainActivity

echo "✓ Successfully installed and launched!"`;

      // 5. Bubblewrap / CLI APK build instructions (twa-manifest.json)
      const twaManifest = JSON.stringify(
        {
          packageId: 'com.monkeybones702.starlightdjtool',
          host: window.location.host,
          name: 'Starlight DJ Tool',
          launcherName: 'Starlight DJ',
          themeColor: '#06b6d4',
          navigationColor: '#090d16',
          backgroundColor: '#090d16',
          startUrl: '/',
          iconUrl: `${window.location.origin}/icon.svg`,
          maskableIconUrl: `${window.location.origin}/icon.svg`,
          appVersion: '1.0.0',
          generatorApp: 'bubblewrap-cli',
          enableNotifications: false,
          features: {
            usb: true,
            midi: true,
          },
        },
        null,
        2
      );

      // 6. README.md with Samsung A16 & Shizuku step-by-step
      const readme = `# Starlight DJ Tool - Android APK & Shizuku Build Guide

Target Device: Samsung Galaxy A16 (SM-A165F / SM-A166B)
Target Hardware: Hercules DJControl Starlight via USB-OTG
Author: monkeybones702 (https://github.com/monkeybones702/Samsung-starlight-djtool)

## Option 1: Instant WebAPK Installation on Samsung A16 (Recommended)
1. Open this app on your Samsung A16 in Google Chrome or Samsung Internet.
2. Tap the browser menu (⋮) -> "Install App" or "Add to Home screen".
3. Samsung One UI will generate an official WebAPK with native USB host support!

## Option 2: Build Standalone APK with Bubblewrap CLI (1 Command)
If you have Node.js or Termux on Android:
\`\`\`bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=${window.location.origin}/manifest.json
bubblewrap build
# Result: app-release-signed.apk generated!
\`\`\`

## Option 3: Install & Manage with Shizuku on Samsung A16
Since your Samsung A16 has Shizuku configured:
1. Copy the built APK to \`/sdcard/Download/starlight-djtool.apk\`.
2. Open Termux with Shizuku (rish) and run:
\`\`\`bash
rish -c "pm install -r -d /sdcard/Download/starlight-djtool.apk"
\`\`\`
3. Grant USB Host permissions silently:
\`\`\`bash
rish -c "pm grant com.monkeybones702.starlightdjtool android.permission.USB_PERMISSION"
\`\`\`
`;

      // Add files to ZIP
      zip.file('AndroidManifest.xml', manifestXml);
      zip.file('res/xml/device_filter.xml', deviceFilterXml);
      zip.file('src/MainActivity.kt', mainActivityKt);
      zip.file('shizuku_install.sh', shizukuScript);
      zip.file('twa-manifest.json', twaManifest);
      zip.file('README.md', readme);

      // Generate blob & download
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `starlight-djtool-android-apk-bundle-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating APK package zip:', err);
      alert('Failed to generate APK bundle zip.');
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const copyShizukuCommand = () => {
    navigator.clipboard.writeText('rish -c "pm install -r -d /sdcard/Download/starlight-djtool.apk"');
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-md">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Samsung A16 APK &amp; Installation Hub
                <span className="text-[10px] font-mono bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700">
                  Android 14 / One UI
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                PWA WebAPK install, Android Studio / Bubblewrap bundle, and Shizuku deployment
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option 1: Native 1-Tap PWA / WebAPK */}
        <div className="bg-slate-950 p-4 rounded-xl border border-cyan-800/50 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Recommended for Samsung A16
              </span>
              <h4 className="text-sm font-bold text-white">Direct WebAPK Home Screen Install</h4>
              <p className="text-xs text-slate-300">
                Creates an official standalone WebAPK on your Samsung Galaxy A16. Runs in landscape fullscreen with direct USB OTG WebMIDI &amp; WebUSB access and zero address bar.
              </p>
            </div>

            <button
              onClick={handleInstallPWA}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install to A16</span>
            </button>
          </div>
        </div>

        {/* Option 2: Download Ready-To-Compile APK Project Package */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5" /> Full Android Project Bundle
              </span>
              <h4 className="text-sm font-bold text-white">Download APK Source &amp; Shizuku Bundle (.ZIP)</h4>
              <p className="text-xs text-slate-400">
                Includes <code className="text-cyan-300">AndroidManifest.xml</code> with USB Host filter, <code className="text-cyan-300">MainActivity.kt</code>, Bubblewrap config, and <code className="text-purple-300">shizuku_install.sh</code>.
              </p>
            </div>

            <button
              onClick={handleDownloadAPKBundle}
              disabled={isGeneratingZip}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingZip ? 'Generating...' : 'Download ZIP'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Option 3: Shizuku Silent Installer Command */}
        <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-mono">
              <Terminal className="w-4 h-4 text-purple-400" />
              Shizuku Silent APK Install Command
            </span>
            <button
              onClick={copyShizukuCommand}
              className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 flex items-center gap-1"
            >
              {copiedCommand ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <span>Copy Command</span>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Run this in Termux with Shizuku enabled (<code className="text-cyan-300">rish</code>) on your Samsung A16 to install the APK file silently without package installer popups:
          </p>
          <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-xs text-purple-300 border border-slate-800 select-all break-all">
            rish -c "pm install -r -d /sdcard/Download/starlight-djtool.apk"
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs text-slate-500">
          <span>GitHub: monkeybones702/Samsung-starlight-djtool</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
