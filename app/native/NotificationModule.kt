package {{packageName}}

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

class NotificationModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "NotificationModule"
        private var reactContextInstance: ReactApplicationContext? = null

        private val reasonNotificationJSON = JSONObject()
    }

    init {
        reactContextInstance = reactContext
        // Needed "cryptos" | "allNotifications" | "streamers" | "locationEnabled" |
        // "noInternetConnection" | "batteryAlerts" | "downDetector"
        reasonNotificationJSON.put("cryptos", "")
        reasonNotificationJSON.put("allNotifications", "")
        reasonNotificationJSON.put("streamers", "")
        reasonNotificationJSON.put("locationEnabled", "")
        reasonNotificationJSON.put("noInternetConnection", "")
        reasonNotificationJSON.put("batteryAlerts", "")
        reasonNotificationJSON.put("downDetector", "")
        Log.d("NotificationModule", "NotificationModule initialized")
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun createNotificationChannel(
        channelId: String,
        channelName: String,
        importance: Int,
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel =
                NotificationChannel(
                    channelId,
                    channelName,
                    importance,
                )
                    .apply {
                        setShowBadge(false)
                        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                    }

            val notificationManager =
                reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
            Log.d("NotificationModule", "Channel created: $channelId")
        }
    }

    @ReactMethod
    fun cancelPreviousReasonNotification(reasonNotification: String) {
        try {
            val prevNotifyIdStr = reasonNotificationJSON.optString(reasonNotification)
            val prevNotifyId = prevNotifyIdStr.toIntOrNull()

            if (prevNotifyId != null) {
                cancelNotification(prevNotifyId, reasonNotification)
                Log.d(
                    "NotificationModule",
                    "Cancelled previous notification for reason: $reasonNotification with ID: $prevNotifyId"
                )
            }
        } catch (e: Exception) {
            Log.e(
                "NotificationModule",
                "Error cancelling previous notification for reason: $reasonNotification: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun sendNotification(
        notificationId: Int,
        title: String,
        message: String,
        channelId: String,
        reasonNotification: String,
        overrideNotification: Boolean,
        data: ReadableMap?,
        actions: ReadableArray?,
        promise: Promise,
    ) {
        if (!overrideNotification) {
            cancelPreviousReasonNotification(reasonNotification)
        }

        try {
            val finalNotificationId = if (overrideNotification) {
                reasonNotificationJSON.optString(reasonNotification).toIntOrNull() ?: notificationId
            } else {
                notificationId
            }

            val notificationBuilder =
                NotificationCompat.Builder(reactContext, channelId)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setAutoCancel(true)
                    .setPriority(
                        if (overrideNotification) NotificationCompat.PRIORITY_LOW
                        else NotificationCompat.PRIORITY_DEFAULT
                    )

            val openAppIntent =
                reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
            val openAppPendingIntent =
                PendingIntent.getActivity(
                    reactContext,
                    finalNotificationId,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            notificationBuilder.setContentIntent(openAppPendingIntent)

            val dataJsonString =
                if (data != null) {
                    try {
                        readableMapToJson(data).toString()
                    } catch (e: Exception) {
                        Log.e("NotificationModule", "Error converting data to JSON: ${e.message}")
                        "{}"
                    }
                } else {
                    "{}"
                }
            Log.d("NotificationModule", "Data JSON: $dataJsonString")

            if (actions != null && actions.size() > 0) {
                Log.d("NotificationModule", "Processing ${actions.size()} actions")

                for (i in 0 until actions.size()) {
                    try {
                        val action = actions.getMap(i)
                        if (action == null) {
                            Log.w("NotificationModule", "Action at index $i is null")
                            continue
                        }

                        val actionId = action.getString("actionId")
                        val actionTitle = action.getString("title")
                        val iconName = action.getString("icon")

                        if (actionId == null || actionTitle == null) {
                            Log.w("NotificationModule", "Action $i has null actionId or title")
                            continue
                        }

                        val iconResId = getIconResource(iconName)
                        Log.d("NotificationModule", "  iconResId: $iconResId")

                        val actionIntent =
                            Intent(reactContext, NotificationActionReceiver::class.java).apply {
                                putExtra("actionId", actionId)
                                putExtra("notificationId", finalNotificationId)
                                putExtra("title", title)
                                putExtra("message", message)
                                putExtra("reasonNotification", reasonNotification)
                                putExtra("data", dataJsonString)
                            }

                        val actionPendingIntent =
                            PendingIntent.getBroadcast(
                                reactContext,
                                finalNotificationId * 100 + i,
                                actionIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                            )

                        notificationBuilder.addAction(iconResId, actionTitle, actionPendingIntent)
                        Log.d("NotificationModule", "Action $i added successfully")
                    } catch (e: Exception) {
                        Log.e("NotificationModule", "Error processing action $i: ${e.message}", e)
                    }
                }
            } else {
                Log.d("NotificationModule", "No actions to add")
            }

            val notificationManager =
                reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            notificationManager.notify(finalNotificationId, notificationBuilder.build())
            reasonNotificationJSON.put(reasonNotification, finalNotificationId.toString())

            Log.d("NotificationModule", "Notification sent successfully with ID: $finalNotificationId")
            promise.resolve(finalNotificationId)
        } catch (e: Exception) {
            Log.e("NotificationModule", "Error sending notification: ${e.message}", e)
            e.printStackTrace()
            promise.reject("NOTIFICATION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelNotification(notificationId: Int, reasonNotification: String) {
        try {
            val notificationManager =
                reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            reasonNotificationJSON.put(reasonNotification, "")

            Log.d("NotificationModule", "Notification cancelled: $notificationId")
        } catch (e: Exception) {
            Log.e(
                "NotificationModule",
                "Error cancelling notification $notificationId: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun cancelAllNotifications() {
        val notificationManager =
            reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancelAll()
        Log.d("NotificationModule", "All notifications cancelled")
    }

    private fun getIconResource(iconName: String?): Int {
        val resId =
            when (iconName) {
                "pause" -> android.R.drawable.ic_media_pause
                "play" -> android.R.drawable.ic_media_play
                "stop" -> android.R.drawable.ic_menu_close_clear_cancel
                "delete" -> android.R.drawable.ic_menu_delete
                "info" -> android.R.drawable.ic_dialog_info
                "settings" -> android.R.drawable.ic_menu_preferences
                else -> android.R.drawable.ic_dialog_info
            }
        Log.d("NotificationModule", "Icon '$iconName' -> resource ID: $resId")
        return resId
    }

    private fun readableMapToJson(readableMap: ReadableMap): JSONObject {
        val json = JSONObject()
        val iterator = readableMap.keySetIterator()

        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (readableMap.getType(key)) {
                com.facebook.react.bridge.ReadableType.Null -> json.put(key, null)
                com.facebook.react.bridge.ReadableType.Boolean ->
                    json.put(key, readableMap.getBoolean(key))

                com.facebook.react.bridge.ReadableType.Number ->
                    json.put(key, readableMap.getDouble(key))

                com.facebook.react.bridge.ReadableType.String ->
                    json.put(key, readableMap.getString(key))

                com.facebook.react.bridge.ReadableType.Map ->
                    json.put(key, readableMapToJson(readableMap.getMap(key)!!))

                com.facebook.react.bridge.ReadableType.Array -> {}
            }
        }
        return json
    }
}
