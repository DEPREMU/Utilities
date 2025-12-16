package {{packageName}}

import android.app.ActivityManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.os.Handler
import android.os.Looper

class RestartServiceReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val action = intent.action
        Log.d("RestartServiceReceiver", "Received action: $action")

        val isResumeEvent = action == Intent.ACTION_SCREEN_ON
        val isSuspendEvent = action == Intent.ACTION_SCREEN_OFF

        if (isResumeEvent) {
            Log.d("RestartServiceReceiver", "Screen ON event, sending resume event to React Native")
            BackgroundServiceModule.sendEvent("onUpdateSuspendResume", "resumed")
        }

        if (isSuspendEvent) {
            Log.d("RestartServiceReceiver", "Screen OFF event, sending suspend event to React Native")
            BackgroundServiceModule.sendEvent("onUpdateSuspendResume", "suspended")
            return
        }

        checkReactAliveAsync(context, 5000L) { isAlive ->
            if (isAlive) {
                Log.d("RestartServiceReceiver", "React Native is alive, no need to restart activity")
            } else {
                Log.d("RestartServiceReceiver", "React Native not alive, restarting main activity")
                restartMainActivity(context)
            }
        }
    }

    private fun checkReactAliveAsync(
        context: Context,
        timeoutMs: Long = 5000L,
        callback: (Boolean) -> Unit
    ) {
        BackgroundServiceModule.isReactAlive.set(false)

        BackgroundServiceModule.sendEvent("queryAppState", "asking")

        Handler(Looper.getMainLooper()).postDelayed({
            callback(BackgroundServiceModule.isReactAlive.get())
        }, timeoutMs)
    }

    private fun startForegroundServiceWithSavedConfig(context: Context) {
        val prefs = context.getSharedPreferences("ForegroundServicePrefs", Context.MODE_PRIVATE)
        
        val wasConfigured = prefs.getBoolean("wasConfigured", false)
        if (!wasConfigured) {
            Log.d("RestartServiceReceiver", "Service not yet configured, skipping auto-start")
            return
        }
        
        val serviceIntent = Intent(context, MyForegroundService::class.java).apply {
            putExtra("title", prefs.getString("title", "Servicio Activo"))
            putExtra("message", prefs.getString("message", "Utilities está ejecutándose en segundo plano."))
            
            val clipboardEnabled = prefs.getBoolean("clipboardEnabled", false)
            if (clipboardEnabled) {
                putExtra("enableClipboard", true)
                putExtra("userId", prefs.getString("userId", null))
                putExtra("deviceId", prefs.getString("deviceId", "${Build.MANUFACTURER} ${Build.MODEL}"))
                putExtra("userToken", prefs.getString("userToken", null))
                putExtra("lang", prefs.getString("lang", "en"))
            }
        }
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Log.d("RestartServiceReceiver", "Foreground service auto-started from receiver")
        } catch (e: Exception) {
            Log.e("RestartServiceReceiver", "Error auto-starting foreground service: ${e.message}")
        }
    }

    private fun restartMainActivity(context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= 29 && !Settings.canDrawOverlays(context)) {
                Log.w("RestartServiceReceiver", "Could not start activity automatically: Missing overlay permission.")
                return
            }

            var launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)

            if (launchIntent == null) {
                Log.w("RestartServiceReceiver", "LaunchIntent is null, trying alternatives to resolve main activity")

                try {
                    val mainIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setPackage(context.packageName)
                    val resolveList = context.packageManager.queryIntentActivities(mainIntent, 0)
                    if (resolveList != null && resolveList.isNotEmpty()) {
                        val activityName = resolveList[0].activityInfo.name
                        launchIntent = Intent(Intent.ACTION_MAIN).setClassName(context.packageName, activityName)
                        Log.d("RestartServiceReceiver", "Resolved main activity via package-manager: $activityName")
                    }
                } catch (e: Exception) {
                    Log.w("RestartServiceReceiver", "Error querying launcher activities: ${e.message}")
                }

                if (launchIntent == null) {
                    val candidates = arrayOf(
                        context.packageName + ".MainActivity",
                        context.packageName + ".LauncherActivity",
                        "host.exp.exponent.MainActivity",
                        "expo.modules.devclient.MainActivity"
                    )
                    for (candidate in candidates) {
                        try {
                            val mainActivityClass = Class.forName(candidate)
                            launchIntent = Intent(context, mainActivityClass)
                            Log.d("RestartServiceReceiver", "Resolved main activity via reflection: $candidate")
                            break
                        } catch (e: ClassNotFoundException) {
                        } catch (e: Exception) {
                            Log.w("RestartServiceReceiver", "Error trying candidate $candidate: ${e.message}")
                        }
                    }
                }
            }

            if (launchIntent != null) {
                launchIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
                launchIntent.putExtra("launchedFromService", true)
                context.startActivity(launchIntent)
                Log.d("RestartServiceReceiver", "Activity restarted from receiver to reload JS")
            } else {
                Log.e("RestartServiceReceiver", "Failed to obtain or create launch intent")
            }
        } catch (e: Exception) {
            Log.e("RestartServiceReceiver", "Error starting activity: ${e.message}")
        }
    }
}