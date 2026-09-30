package io.lowkey.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String HOME = "https://slither.io/";
    private static final String MOD_HOST = "lwkmod.local";
    private static final int REQ_FILE = 71;

    private WebView wv;
    private ValueCallback<Uri[]> filePicker;

    private static boolean isGameHost(String h) {
        return h != null && (h.equals("slither.io") || h.endsWith(".slither.io")
                || h.equals("slither.com") || h.endsWith(".slither.com"));
    }

    private static boolean isAllowedScriptHost(String h) {
        return h != null && (h.equals(MOD_HOST) || h.equals("ntl-slither.com") || h.endsWith(".ntl-slither.com"));
    }

    private static String mime(String p) {
        p = p.toLowerCase();
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".html")) return "text/html";
        return "application/octet-stream";
    }

    private static Map<String, String> cors() {
        Map<String, String> m = new HashMap<String, String>();
        m.put("Access-Control-Allow-Origin", "*");
        return m;
    }

    private WebResourceResponse modAsset(String path) {
        String name = path == null ? "" : path;
        while (name.startsWith("/")) name = name.substring(1);
        try {
            InputStream in = getAssets().open("lwkmod/" + name);
            return new WebResourceResponse(mime(name), "utf-8", 200, "OK", cors(), in);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", cors(),
                    new ByteArrayInputStream(new byte[0]));
        }
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        wv = new WebView(this);
        wv.setBackgroundColor(Color.BLACK);
        setContentView(wv);

        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setAllowFileAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);

        wv.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String host = u.getHost();
                String path = u.getPath() == null ? "" : u.getPath();
                if (MOD_HOST.equals(host)) return modAsset(path);
                // same job as the extension's rule: the game's own scripts are replaced by main-mt.js
                if (!r.isForMainFrame() && path.endsWith(".js") && !isAllowedScriptHost(host)) {
                    return new WebResourceResponse("application/javascript", "utf-8", 200, "OK", cors(),
                            new ByteArrayInputStream(new byte[0]));
                }
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String h = r.getUrl().getHost();
                if (isGameHost(h) || isAllowedScriptHost(h)) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl()));
                } catch (Exception ignored) { }
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                if (!isGameHost(Uri.parse(url).getHost())) return;
                v.evaluateJavascript("(function(){if(window.__lwkInj)return;window.__lwkInj=1;"
                        + "var d=document.documentElement,s=document.createElement('script');"
                        + "s.src='https://lwkmod.local/lwk-shim.js';s.async=false;"
                        + "s.onload=function(){var t=document.createElement('script');"
                        + "t.src='https://lwkmod.local/tinyscr.js';d.appendChild(t)};"
                        + "d.appendChild(s)})()", null);
            }
        });

        wv.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (filePicker != null) filePicker.onReceiveValue(null);
                filePicker = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Select file"), REQ_FILE);
                } catch (Exception e) {
                    filePicker = null;
                    return false;
                }
                return true;
            }
        });

        if (b != null) wv.restoreState(b); else wv.loadUrl(HOME);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_FILE && filePicker != null) {
            Uri[] r = null;
            if (res == RESULT_OK && data != null && data.getData() != null) r = new Uri[]{data.getData()};
            filePicker.onReceiveValue(r);
            filePicker = null;
        } else {
            super.onActivityResult(req, res, data);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean f) {
        super.onWindowFocusChanged(f);
        if (f) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle o) {
        super.onSaveInstanceState(o);
        wv.saveState(o);
    }

    @Override
    protected void onPause() { super.onPause(); wv.onPause(); }

    @Override
    protected void onResume() { super.onResume(); wv.onResume(); }

    @Override
    protected void onDestroy() { wv.destroy(); super.onDestroy(); }
}
