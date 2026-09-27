# =====================================================================
#  REDUNDANT ARCADE - release shrinker rules
# =====================================================================
#  R8 (minifyEnabled) strips unused classes/methods. Three things in this
#  app are invisible to the shrinker and would break if it touched them:
#
#   1. NativeBridge - every @JavascriptInterface method is called from
#      JavaScript by name. R8 cannot see those callers, so it happily
#      renames or deletes them and the games silently stop working.
#   2. ChunkyCardView - instantiated by name from activity_main.xml and
#      item_game_tile.xml, never from Kotlin source.
#   3. Activities - referenced from the manifest / intent filters only.
#
#  Every one of those fails at RUNTIME only, on a release build, with no
#  build-time error. If the shell looks fine but a game goes quiet after
#  enabling minification, this file is the first place to look.
# =====================================================================

# ---- 1. the WebView -> Kotlin bridge -----------------------------------
# The class must keep its name (JS calls window.NativeBridge) and every
# @JavascriptInterface method must keep ITS name and signature.
-keepclassmembers class com.redundantstudios.arcade.bridge.NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.redundantstudios.arcade.bridge.NativeBridge { *; }
# The handler singleton is read from several activities.
-keep class com.redundantstudios.arcade.bridge.NativeBridgeContext { *; }

# ---- 2. views inflated from XML ---------------------------------------
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
}
-keep public class com.redundantstudios.arcade.ui.** { *; }

# ---- 3. manifest-referenced components --------------------------------
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver

# ---- WebView glue ----------------------------------------------------
# Games run in a WebView and are the app's real content; do not let the
# shrinker rewrite the bridge object or strip settings plumbing.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---- Kotlin coroutines / Parcelable (used by WorkManager + ads) -------
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# ---- Google Play Services / AdMob / UMP --------------------------------
# These are already covered by their own consumer rules, but keeping the
# annotations avoids a strip of the ad callback interfaces the shell
# implements by name.
-keep class com.google.android.gms.ads.** { *; }
-keep interface com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.**

# ---- diagnostics ------------------------------------------------------
# Keep line numbers so a Play Console crash report maps back to source,
# but hide the original file name (standard release recipe).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
