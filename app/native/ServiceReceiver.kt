package com.package.name

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.ReactApplication

class ServiceReceiver : BroadcastReceiver() {
    companion object {
        private const val ACTION_RESTART_APP = "ACTION_RESTART_APP"
        private const val INITIAL_LIVENESS_TIMEOUT_MS = 3000L
        private const val RETRY_LIVENESS_TIMEOUT_MS = 2500L
        private const val RETRY_DELAY_MS = 1200L
        private const val MAX_LIVENESS_RETRIES = 8
        private const val RN_BOOT_GRACE_MS = 20000L

        @Volatile
        private var isRecreatingContext = false

        @Volatile
        private var recreateStartedAtMs: Long = 0L

        @Volatile
        private var livenessProbeToken: Long = 0L
    }

    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val action = intent.action
        Log.d("ServiceReceiver", "Received action: $action")

        if (action == ACTION_RESTART_APP) {
            Log.d("ServiceReceiver", "ACTION_RESTART_APP received, ensuring React bridge is available")
            ensureReactBridgeAvailable(context)
            return
        }

        val isResumeEvent = action == Intent.ACTION_SCREEN_ON
        val isSuspendEvent = action == Intent.ACTION_SCREEN_OFF

        if (isResumeEvent) {
            Log.d("ServiceReceiver", "Screen ON event, sending resume event to React Native")
            BackgroundServiceModule.sendEvent("onUpdateSuspendResume", "resumed")
        }

        if (isSuspendEvent) {
            Log.d("ServiceReceiver", "Screen OFF event, sending suspend event to React Native")
            BackgroundServiceModule.sendEvent("onUpdateSuspendResume", "suspended")
            return
        }

        ensureReactBridgeAvailable(context)
    }

    private fun checkReactAliveAsync(timeoutMs: Long, callback: (Boolean) -> Unit) {
        BackgroundServiceModule.isReactAlive.set(false)

        BackgroundServiceModule.sendEvent("queryAppState", "asking")

        Handler(Looper.getMainLooper()).postDelayed({
            callback(BackgroundServiceModule.isReactAlive.get())
        }, timeoutMs)
    }

    private fun startForegroundServiceWithSavedConfig(context: Context) {
        val preferences = ForegroundPreferences(context)
        val savedConfig = preferences.load()

        if (!savedConfig.wasConfigured) {
            Log.d("ServiceReceiver", "Service not yet configured, skipping auto-start")
            return
        }

        try {
            MyForegroundService.start(context, savedConfig)
            Log.d("ServiceReceiver", "Foreground service auto-started from receiver")
        } catch (e: Exception) {
            Log.e("ServiceReceiver", "Error auto-starting foreground service: ${e.message}")
        }
    }

    private fun ensureReactBridgeAvailable(context: Context) {
        if (hasActiveReactContext(context)) {
            Log.d("ServiceReceiver", "React context already active, skipping recreation")
            return
        }

        if (isRecreatingContext) {
            Log.d("ServiceReceiver", "React context recreation already in progress, waiting for liveness")
            waitForReactLivenessOrFallback(context, 0)
            return
        }

        recreateReactContextInBackgroundOrLaunchActivity(context)
    }

    private fun hasActiveReactContext(context: Context): Boolean {
        return try {
            val app = context.applicationContext as? ReactApplication ?: return false
            val manager = app.reactNativeHost.reactInstanceManager
            val current = manager.currentReactContext
            current != null && current.hasActiveReactInstance()
        } catch (_: Exception) {
            false
        }
    }

    private fun recreateReactContextInBackgroundOrLaunchActivity(context: Context) {
        try {
            val app = context.applicationContext as? ReactApplication
            if (app == null) {
                Log.e("ServiceReceiver", "Application is not ReactApplication, cannot recreate React context")
                launchMainActivity(context)
                return
            }

            val reactInstanceManager = app.reactNativeHost.reactInstanceManager

            Handler(Looper.getMainLooper()).post {
                try {
                    val activeContext = reactInstanceManager.currentReactContext
                    if (activeContext != null && activeContext.hasActiveReactInstance()) {
                        Log.d("ServiceReceiver", "React context is already active")
                        return@post
                    }

                    isRecreatingContext = true
                    recreateStartedAtMs = SystemClock.elapsedRealtime()
                    reactInstanceManager.createReactContextInBackground()
                    Log.d("ServiceReceiver", "Requested createReactContextInBackground successfully")
                    waitForReactLivenessOrFallback(context, 0)
                } catch (error: Exception) {
                    Log.e("ServiceReceiver", "Error creating React context in background: ${error.message}")
                    isRecreatingContext = false
                    launchMainActivity(context)
                }
            }
        } catch (e: Exception) {
            Log.e("ServiceReceiver", "Error preparing React context recreation: ${e.message}")
            isRecreatingContext = false
            launchMainActivity(context)
        }
    }

    private fun waitForReactLivenessOrFallback(context: Context, attempt: Int) {
        val token = ++livenessProbeToken
        val timeout = if (attempt == 0) INITIAL_LIVENESS_TIMEOUT_MS else RETRY_LIVENESS_TIMEOUT_MS

        if (hasActiveReactContext(context)) {
            Log.d("ServiceReceiver", "React context became active without additional probing")
            isRecreatingContext = false
            return
        }

        checkReactAliveAsync(timeout) { eventAlive ->
            if (token != livenessProbeToken) return@checkReactAliveAsync

            val alive = eventAlive || hasActiveReactContext(context)
            if (alive) {
                Log.d("ServiceReceiver", "React runtime confirmed alive")
                isRecreatingContext = false
                return@checkReactAliveAsync
            }

            val elapsed = SystemClock.elapsedRealtime() - recreateStartedAtMs
            val withinGrace = elapsed < RN_BOOT_GRACE_MS
            val canRetry = attempt < MAX_LIVENESS_RETRIES

            if (withinGrace || canRetry) {
                Log.w(
                    "ServiceReceiver",
                    "React runtime not alive yet (attempt=${attempt + 1}, elapsed=${elapsed}ms), retrying before fallback",
                )
                Handler(Looper.getMainLooper()).postDelayed({
                    waitForReactLivenessOrFallback(context, attempt + 1)
                }, RETRY_DELAY_MS)
                return@checkReactAliveAsync
            }

            Log.w("ServiceReceiver", "React runtime not alive after grace period, launching MainActivity fallback")
            isRecreatingContext = false
            launchMainActivity(context)
        }
    }

    private fun launchMainActivity(context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= 29 && !Settings.canDrawOverlays(context)) {
                Log.w("ServiceReceiver", "Fallback launch skipped: Missing overlay permission for background activity launch")
                return
            }

            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent == null) {
                Log.e("ServiceReceiver", "Fallback launch failed: package launch intent is null")
                return
            }

            launchIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP,
            )
            launchIntent.putExtra("launchedFromService", true)
            context.startActivity(launchIntent)
            Log.d("ServiceReceiver", "MainActivity launched as fallback")
        } catch (error: Exception) {
            Log.e("ServiceReceiver", "Error launching MainActivity fallback: ${error.message}")
        }
    }
}