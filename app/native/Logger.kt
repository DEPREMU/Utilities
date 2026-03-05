package com.package.name

import android.util.Log
import timber.log.Timber

object Logger {
    private val shouldLog: Boolean =
        BuildConfig.DEBUG || BuildConfig.BUILD_TYPE.contains("preview", ignoreCase = true)

    init {
        if (shouldLog && Timber.forest().isEmpty()) {
            Timber.plant(Timber.DebugTree())
        }
    }

    private fun canLog(): Boolean {
        if (!shouldLog) {
            return false
        }

        if (Timber.forest().isEmpty()) {
            Timber.plant(Timber.DebugTree())
        }

        return true
    }

    fun d(tag: String, message: String): Int {
        if (!canLog()) return 0
        Timber.tag(tag).d(message)
        return 0
    }

    fun i(tag: String, message: String): Int {
        if (!canLog()) return 0
        Timber.tag(tag).i(message)
        return 0
    }

    fun w(tag: String, message: String): Int {
        if (!canLog()) return 0
        Timber.tag(tag).w(message)
        return 0
    }

    fun w(tag: String, message: String, throwable: Throwable?): Int {
        if (!canLog()) return 0
        if (throwable != null) {
            Timber.tag(tag).w(throwable, message)
        } else {
            Timber.tag(tag).w(message)
        }
        return 0
    }

    fun e(tag: String, message: String): Int {
        if (!canLog()) return 0
        Timber.tag(tag).e(message)
        return 0
    }

    fun e(tag: String, message: String, important: Boolean): Int {
        if (!canLog()) return 0
        return if (important) {
            Log.e(tag, message)
        } else {
            Timber.tag(tag).e(message)
            0
        }
    }

    fun e(tag: String, message: String, throwable: Throwable?): Int {
        if (!canLog()) return 0
        if (throwable != null) {
            Timber.tag(tag).e(throwable, message)
        } else {
            Timber.tag(tag).e(message)
        }
        return 0
    }

    fun v(tag: String, message: String): Int {
        if (!canLog()) return 0
        Timber.tag(tag).v(message)
        return 0
    }
}