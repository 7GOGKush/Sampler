package com.globetv.onn

import android.graphics.Bitmap
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.FragmentActivity

/**
 * Globe TV for Onn (Android TV)
 *
 * A full-screen WebView wrapper for https://globetv.app/us/ optimised for
 * Android TV / Onn remote-control navigation:
 *  - Full-screen, hardware-accelerated WebView
 *  - TV Smart-TV user-agent so the site renders its desktop layout
 *  - JavaScript, DOM storage, and autoplay enabled
 *  - Inline + fullscreen HTML5 video with ExoPlayer-level media support
 *  - D-pad / remote BACK button navigates WebView history or exits
 *  - Loading progress bar and offline error overlay
 */
class MainActivity : FragmentActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var errorOverlay: View
    private lateinit var errorMessage: TextView
    private lateinit var fullscreenContainer: FrameLayout
    private var fullscreenCallback: WebChromeClient.CustomViewCallback? = null
    private var customView: View? = null

    companion object {
        private const val TARGET_URL = "https://globetv.app/us/"
        // Smart-TV user-agent: renders the site in desktop/TV mode
        private const val TV_USER_AGENT =
            "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) " +
            "AppleWebKit/538.1 (KHTML, like Gecko) " +
            "Version/6.0 TV Safari/538.1"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on while content is playing
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        errorOverlay = findViewById(R.id.errorOverlay)
        errorMessage = findViewById(R.id.errorMessage)
        fullscreenContainer = findViewById(R.id.fullscreenContainer)

        setupWebView()
        loadSite()
    }

    private fun setupWebView() {
        // Enable remote debugging via chrome://inspect (useful during development)
        WebView.setWebContentsDebuggingEnabled(false)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true

            // Autoplay video without requiring a user gesture (essential for live TV)
            mediaPlaybackRequiresUserGesture = false

            // Allow mixed content (many IPTV streams are plain HTTP)
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

            // Use the TV user-agent so globetv renders its full desktop UI
            userAgentString = TV_USER_AGENT

            // Viewport / zoom — disable pinch zoom on TV (no touchscreen)
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false

            // Cache strategy: use cache when available, fall back to network
            cacheMode = WebSettings.LOAD_DEFAULT

            loadsImagesAutomatically = true
            allowFileAccess = false
            allowContentAccess = false
        }

        // Persist cookies across sessions (login state, preferences)
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.webViewClient = GlobeTVClient()
        webView.webChromeClient = GlobeTVChromeClient()
    }

    private fun loadSite() {
        errorOverlay.visibility = View.GONE
        webView.loadUrl(TARGET_URL)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // WebViewClient — intercepts page lifecycle and errors
    // ──────────────────────────────────────────────────────────────────────────

    inner class GlobeTVClient : WebViewClient() {

        override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
            progressBar.visibility = View.VISIBLE
            errorOverlay.visibility = View.GONE
        }

        override fun onPageFinished(view: WebView, url: String) {
            progressBar.visibility = View.GONE

            // Inject CSS tweaks: hide scroll-bars for a cleaner TV experience
            // and ensure anchor / button elements are focusable via D-pad
            view.evaluateJavascript(
                """
                (function() {
                    var style = document.createElement('style');
                    style.textContent = [
                        '::-webkit-scrollbar { display: none !important; }',
                        'body { overflow: hidden; }',
                        'a, button, [role="button"], [tabindex] { outline: 3px solid transparent; }',
                        'a:focus, button:focus, [role="button"]:focus, [tabindex]:focus {',
                        '  outline: 3px solid #00bcd4 !important;',
                        '  outline-offset: 2px !important;',
                        '}'
                    ].join('');
                    document.head.appendChild(style);
                })();
                """.trimIndent(),
                null
            )
        }

        override fun onReceivedError(
            view: WebView,
            request: WebResourceRequest,
            error: WebResourceError
        ) {
            // Only show the error overlay for the main frame request
            if (request.isForMainFrame) {
                progressBar.visibility = View.GONE
                errorMessage.text = getString(R.string.error_no_connection)
                errorOverlay.visibility = View.VISIBLE
            }
        }

        // Keep all navigation inside the WebView
        override fun shouldOverrideUrlLoading(
            view: WebView,
            request: WebResourceRequest
        ): Boolean {
            view.loadUrl(request.url.toString())
            return true
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // WebChromeClient — progress + HTML5 fullscreen video
    // ──────────────────────────────────────────────────────────────────────────

    inner class GlobeTVChromeClient : WebChromeClient() {

        override fun onProgressChanged(view: WebView, newProgress: Int) {
            progressBar.progress = newProgress
        }

        /** Called when a video requests fullscreen (e.g. user taps the ⛶ button) */
        override fun onShowCustomView(view: View, callback: CustomViewCallback) {
            // Dismiss any existing custom view first
            onHideCustomView()

            customView = view
            fullscreenCallback = callback

            fullscreenContainer.addView(view)
            fullscreenContainer.visibility = View.VISIBLE
            webView.visibility = View.GONE

            // Enter true fullscreen (hide system bars)
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        }

        /** Called when the video exits fullscreen */
        override fun onHideCustomView() {
            customView?.let {
                fullscreenContainer.removeView(it)
                customView = null
            }
            fullscreenCallback?.onCustomViewHidden()
            fullscreenCallback = null

            fullscreenContainer.visibility = View.GONE
            webView.visibility = View.VISIBLE

            // Restore immersive mode
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Remote / D-pad key handling
    // ──────────────────────────────────────────────────────────────────────────

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                when {
                    customView != null -> {
                        // Exit fullscreen video first
                        webView.webChromeClient?.onHideCustomView()
                        true
                    }
                    webView.canGoBack() -> {
                        webView.goBack()
                        true
                    }
                    else -> super.onKeyDown(keyCode, event)
                }
            }
            // Reload with the Menu / PROG_RED / colour buttons (common TV remotes)
            KeyEvent.KEYCODE_MENU,
            KeyEvent.KEYCODE_PROG_RED -> {
                loadSite()
                true
            }
            else -> super.onKeyDown(keyCode, event)
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Activity lifecycle
    // ──────────────────────────────────────────────────────────────────────────

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()

        // Re-apply immersive mode on resume
        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
    }

    override fun onPause() {
        webView.pauseTimers()
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }
}
