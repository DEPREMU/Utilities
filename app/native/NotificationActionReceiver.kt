package com.package.name

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.Arguments
import org.json.JSONObject

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        
        val actionId = intent.getStringExtra("actionId")?.let { action ->
            when (action) {
                "pause", "stop", "dismiss", "info", "settings" -> action
                else -> return
            }
        } ?: return
        val notificationId = intent.getIntExtra("notificationId", -1)
        val title = intent.getStringExtra("title") ?: ""
        val message = intent.getStringExtra("message") ?: ""
        val reasonNotification = intent.getStringExtra("reasonNotification") ?: ""
        val dataJsonString = intent.getStringExtra("data") ?: "{}"

        Log.d("NotificationAction", "Action received: $actionId for notification $notificationId")
        Log.d("NotificationAction", "Data: $dataJsonString")

        val shouldOpenApp =
            when (actionId) {
                "settings" -> true
                "info" -> true
                else -> false
            }

        if (shouldOpenApp) {
            Log.d("NotificationAction", "Opening app for action: $actionId")

            try {
                val packageName = context.packageName
                val launchIntent =
                    context.packageManager.getLaunchIntentForPackage(packageName)?.apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        
                        addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)

                        putExtra("openSettings", true)
                        putExtra("actionId", actionId)
                        putExtra("notificationId", notificationId)
                        putExtra("reasonNotification", reasonNotification)
                    }

                if (launchIntent != null) {
                    Log.d("NotificationAction", "Intent flags: ${launchIntent.flags}")
                    Log.d("NotificationAction", "Starting activity...")

                    context.startActivity(launchIntent)

                    Log.d("NotificationAction", "startActivity called successfully")
                } else {
                    Log.e(
                        "NotificationAction",
                        "Could not get launch intent for package: $packageName"
                    )
                }

            } catch (e: Exception) {
                Log.e("NotificationAction", "Error opening app: ${e.message}", e)
                e.printStackTrace()
            }
        }

        val dataMap = Arguments.createMap()
        try {
            val jsonObject = JSONObject(dataJsonString)
            val keys = jsonObject.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                when (val value = jsonObject.get(key)) {
                    is String -> dataMap.putString(key, value)
                    is Int -> dataMap.putInt(key, value)
                    is Double -> dataMap.putDouble(key, value)
                    is Boolean -> dataMap.putBoolean(key, value)
                }
            }
        } catch (e: Exception) {
            Log.e("NotificationAction", "Error parsing data JSON: ${e.message}")
        }

        val params =
            Arguments.createMap().apply {
                putString("actionId", actionId)
                putInt("notificationId", notificationId)
                putString("title", title)
                putString("message", message)
                putString("reasonNotification", reasonNotification)
                putMap("data", dataMap)
            }

        BackgroundServiceModule.sendEvent("onNotificationAction", params)
    }
}
