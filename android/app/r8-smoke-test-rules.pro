# Only for the opt-in instrumentation APK, NOT the application APK/AAB.
# Error Prone compile-time meta-annotations refer to the JDK compiler's
# Modifier enum, which is intentionally absent from Android's runtime.
-dontwarn javax.lang.model.element.Modifier

# Python invokes this test by its fully qualified class/method name.
-keep class com.nasrinai.movo.r8.ReleaseBridgeSmokeTest { *; }
