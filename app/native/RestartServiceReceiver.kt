package com.utilities.depremu

import com.utilities.depremu.NotificationModule
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log

class RestartServiceReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val action = intent.action
        Log.d("RestartServiceReceiver", "Received action: $action")

        val isPowerConnected = action == Intent.ACTION_POWER_CONNECTED;
        val isPowerDisconnected = action == Intent.ACTION_POWER_DISCONNECTED;

        if (isPowerConnected ||
            isPowerDisconnected ||
            action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED || 
            action == "android.intent.action.QUICKBOOT_POWERON" || 
            action == "com.htc.intent.action.QUICKBOOT_POWERON" ) {
            Log.d("RestartServiceReceiver", "Power/Boot/Update event, starting service...")
        } else {
            Log.d("RestartServiceReceiver", "Service restart triggered")
        }

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
                    Intent.FLAG_ACTIVITY_CLEAR_TASK or
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
