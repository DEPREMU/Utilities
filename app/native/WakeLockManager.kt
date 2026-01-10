package com.package.name

import android.content.Context
import android.os.PowerManager

class WakeLockManager(private val context: Context) {
    private var wakeLock: PowerManager.WakeLock? = null

    fun acquire() {
        val manager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (wakeLock == null) {
            wakeLock = manager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Utilities:ForegroundServiceWakeLock")
        }
        if (wakeLock?.isHeld != true) {
            wakeLock?.acquire()
        }
    }

    fun release() {
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
        wakeLock = null
    }
}
