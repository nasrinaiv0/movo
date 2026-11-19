# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Compact DEX class names on AGP 8.13. Android's default and the bridge
# keep rules below preserve names required for dynamic lookup.
-repackageclasses

# Preserve Capacitor plugin classes and reflected JS bridge method names.
# This includes the annotated MovoNativePlugin security vault; a separate
# class-wide keep for that same class would add no protection.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepattributes RuntimeVisibleAnnotations,Signature,InnerClasses
