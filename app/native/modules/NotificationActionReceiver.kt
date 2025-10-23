package com.utilities.depremu

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val actionId = intent.getStringExtra("actionId") ?: return
        val notificationId = intent.getIntExtra("notificationId", -1)
        val title = intent.getStringExtra("title") ?: ""
        val message = intent.getStringExtra("message") ?: ""
        val reasonNotification = intent.getStringExtra("reasonNotification") ?: ""
        val dataJsonString = intent.getStringExtra("data") ?: "{}"

        Log.d("NotificationAction", "Action received: $actionId for notification $notificationId")
        Log.d("NotificationAction", "Data: $dataJsonString")

        if (actionId == "settings") {
            Log.d("NotificationAction", "Opening app for settings action")
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            launchIntent?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            context.startActivity(launchIntent)
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

        val params = Arguments.createMap().apply {
            putString("actionId", actionId)
            putInt("notificationId", notificationId)
            putString("title", title)
            putString("message", message)
            putString("reasonNotification", reasonNotification)
            putMap("data", dataMap)
        }

        NotificationModule.sendEvent("onNotificationAction", params)
    }
}
