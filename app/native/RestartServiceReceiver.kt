package com.utilities.depremu

import com.utilities.depremu.NotificationModule
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
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
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
                Log.d("RestartServiceReceiver", "Activity started from receiver")
            }
        } catch (e: Exception) {
            Log.e("RestartServiceReceiver", "Error starting activity: ${e.message}")
        }
    }
}
