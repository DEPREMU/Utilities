package com.package.name

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.package.name.Logger as Log

class ServiceReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        when (intent.action) {
            Intent.ACTION_SCREEN_ON -> {
                Log.d("ServiceReceiver", "Screen ON event, sending resume event to React Native")
                BackgroundServiceModule.sendEvent("onUpdateSuspendResume", "resumed")
            }

            Intent.ACTION_SCREEN_OFF -> {
                Log.d("ServiceReceiver", "Screen OFF event, sending suspend event to React Native")
                BackgroundServiceModule.sendEvent("onUpdateSuspendResume", "suspended")
            }

            else -> {
                Log.d("ServiceReceiver", "Ignoring action: ${intent.action}")
            }
        }
    }
}
