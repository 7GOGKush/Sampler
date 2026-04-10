# Add project specific ProGuard rules here.
# Keep WebView JavaScript interface names
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
