package com.package.name

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager
import com.facebook.react.bridge.ReactContext

class ServiceReceiver : BroadcastReceiver() {
    companion object {
        private const val ACTION_RESTART_APP = "ACTION_RESTART_APP"
        private const val EVENT_QUERY_TIMEOUT_MS = 2000L
        private const val EVENT_QUERY_MAX_ATTEMPTS = 5
        private const val RECREATE_WATCHDOG_TIMEOUT_MS = 20000L

        @Volatile
        private var isRecreatingContext = false

        @Volatile
        private var pendingReactInitListener: ReactInstanceManager.ReactInstanceEventListener? = null

        private val recreateLock = Any()
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val action = intent.action
        Log.d("ServiceReceiver", "Received action: $action")

        val isResumeEvent = action == Intent.ACTION_SCREEN_ON
        val isSuspendEvent = action == Intent.ACTION_SCREEN_OFF

        if (isResumeEvent) {
            Log.d("ServiceReceiver", "Screen ON event, sending resume event to React Native")
            BackgroundServiceModule.sendEvent("onUpdateSuspendResume", "resumed")
            return
        }

        if (isSuspendEvent) {
            Log.d("ServiceReceiver", "Screen OFF event, sending suspend event to React Native")
            BackgroundServiceModule.sendEvent("onUpdateSuspendResume", "suspended")
            return
        }

        if (action == ACTION_RESTART_APP) {
            Log.d("ServiceReceiver", "ACTION_RESTART_APP received, ensuring React bridge is available")
        }

        val pendingResult = goAsync()
        ensureReactBridgeAvailable(context, pendingResult)
    }

    private fun checkReactAliveAsync(timeoutMs: Long, callback: (Boolean) -> Unit) {
        BackgroundServiceModule.isReactAlive.set(false)
        BackgroundServiceModule.sendEvent("queryAppState", "asking")

        mainHandler.postDelayed({
            callback(BackgroundServiceModule.isReactAlive.get())
        }, timeoutMs)
    }

    private fun ensureReactBridgeAvailable(context: Context, pendingResult: PendingResult) {
        if (hasActiveReactContext(context)) {
            Log.d("ServiceReceiver", "React context already active, skipping recreation")
            pendingResult.finish()
            return
        }

        synchronized(recreateLock) {
            if (isRecreatingContext) {
                Log.d("ServiceReceiver", "React context recreation already in progress")
                pendingResult.finish()
                return
            }
        }

        probeReactLivenessWithRetries(context, 1, "pre-recreation") { isAlive ->
            if (isAlive) {
                Log.d("ServiceReceiver", "React runtime responded during pre-recreation probe, exiting")
                pendingResult.finish()
                return@probeReactLivenessWithRetries
            }

            Log.w("ServiceReceiver", "React runtime did not respond to probes, recreating context safely")
            recreateReactContextSafely(context, pendingResult)
        }
    }

    private fun hasActiveReactContext(context: Context): Boolean {
        return try {
            val app = context.applicationContext as? ReactApplication ?: return false
            val manager = app.reactNativeHost.reactInstanceManager
            val current = manager.currentReactContext
            current != null &&
                current.hasActiveCatalystInstance() &&
                !isContextDestroyed(current)
        } catch (_: Exception) {
            false
        }
    }

    private fun recreateReactContextSafely(context: Context, pendingResult: PendingResult) {
        val app = context.applicationContext as? ReactApplication
        if (app == null) {
            Log.e("ServiceReceiver", "Application is not ReactApplication, cannot recreate React context")
            launchMainActivity(context)
            pendingResult.finish()
            return
        }

        val manager = app.reactNativeHost.reactInstanceManager

        synchronized(recreateLock) {
            if (isRecreatingContext) {
                Log.d("ServiceReceiver", "Recreation already in progress")
                pendingResult.finish()
                return
            }

            if (hasActiveReactContext(context)) {
                Log.d("ServiceReceiver", "React already active, skipping recreation")
                pendingResult.finish()
                return
            }

            isRecreatingContext = true
        }

        mainHandler.post {
            try {
                if (hasActiveReactContext(context)) {
                    Log.d("ServiceReceiver", "React became active before recreation started")
                    completeRecreationState(manager)
                    pendingResult.finish()
                    return@post
                }

                val listener = object : ReactInstanceManager.ReactInstanceEventListener {
                    override fun onReactContextInitialized(newContext: ReactContext) {
                        Log.d("ServiceReceiver", "New React context initialized")
                        completeRecreationState(manager)
                        pendingResult.finish()
                    }
                }

                synchronized(recreateLock) {
                    pendingReactInitListener?.let { previousListener ->
                        manager.removeReactInstanceEventListener(previousListener)
                    }
                    pendingReactInitListener = listener
                }

                manager.addReactInstanceEventListener(listener)

                manager.currentReactContext?.let {
                    Log.w("ServiceReceiver", "Destroying old React context before recreation")
                    manager.destroy()
                }

                manager.createReactContextInBackground()
                Log.d("ServiceReceiver", "Requested React context recreation")

                mainHandler.postDelayed({
                    if (!isRecreatingContext) {
                        return@postDelayed
                    }

                    Log.e("ServiceReceiver", "React context recreation timed out, launching fallback")
                    completeRecreationState(manager)
                    launchMainActivity(context)
                    pendingResult.finish()
                }, RECREATE_WATCHDOG_TIMEOUT_MS)
            } catch (error: Exception) {
                Log.e("ServiceReceiver", "Error recreating React context: ${error.message}")
                completeRecreationState(manager)
                launchMainActivity(context)
                pendingResult.finish()
            }
        }
    }

    private fun probeReactLivenessWithRetries(
        context: Context,
        attempt: Int,
        phase: String,
        callback: (Boolean) -> Unit,
    ) {
        if (hasActiveReactContext(context)) {
            Log.d("ServiceReceiver", "[$phase] React context already active, probe completed")
            callback(true)
            return
        }

        checkReactAliveAsync(EVENT_QUERY_TIMEOUT_MS) { eventAlive ->
            val alive = eventAlive || hasActiveReactContext(context)
            if (alive) {
                Log.d("ServiceReceiver", "[$phase] React runtime responded on event probe attempt=$attempt")
                callback(true)
                return@checkReactAliveAsync
            }

            if (attempt >= EVENT_QUERY_MAX_ATTEMPTS) {
                Log.w("ServiceReceiver", "[$phase] React runtime did not respond after $EVENT_QUERY_MAX_ATTEMPTS attempts")
                callback(false)
                return@checkReactAliveAsync
            }

            Log.w(
                "ServiceReceiver",
                "[$phase] React runtime did not respond to event probe (attempt=$attempt/$EVENT_QUERY_MAX_ATTEMPTS), retrying",
            )
            probeReactLivenessWithRetries(context, attempt + 1, phase, callback)
        }
    }

    private fun completeRecreationState(manager: ReactInstanceManager) {
        synchronized(recreateLock) {
            pendingReactInitListener?.let { listener ->
                manager.removeReactInstanceEventListener(listener)
            }
            pendingReactInitListener = null
            isRecreatingContext = false
        }
    }

    private fun isContextDestroyed(reactContext: ReactContext): Boolean {
        return try {
            val method = reactContext.javaClass.getMethod("isDestroyed")
            (method.invoke(reactContext) as? Boolean) == true
        } catch (_: Exception) {
            false
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