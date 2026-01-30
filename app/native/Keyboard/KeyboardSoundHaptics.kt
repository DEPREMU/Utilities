package com.package.name

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.SoundPool
import android.os.Build
import android.os.Handler
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.view.HapticFeedbackConstants
import android.view.View
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class KeyboardSoundHaptics(
    private val context: Context,
    private val coroutineScope: CoroutineScope,
    private val themeManager: KeyboardThemeManager,
    private val uiHandler: Handler,
) {
    private var soundPool: SoundPool? = null
    private var keyClickSoundId: Int = 0
    private var vibrator: Vibrator? = null
    private var soundHapticJob: Job? = null

    var vibrationDurationMs: Int = 0
    var soundEnabled: Boolean = true
    var soundVolume: Float = 1f
    var soundRate: Float = 1f
    var vibrationPattern: LongArray? = null
    var vibrationPatternRepeat: Int = -1
    var vibrationAmplitude: Int = -1

    fun init() {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        soundPool = SoundPool.Builder()
            .setMaxStreams(1)
            .setAudioAttributes(audioAttributes)
            .build()

        keyClickSoundId = try {
            soundPool?.load(context, R.raw.key_press, 1) ?: 0
        } catch (_: Exception) {
            0
        }

        vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    fun cancel() {
        soundHapticJob?.cancel()
    }

    fun release() {
        cancel()
        soundPool?.release()
        soundPool = null
    }

    fun playKeyFeedback(view: View, key: String) {
        soundHapticJob?.cancel()
        soundHapticJob = coroutineScope.launch(Dispatchers.Default) {
            if (themeManager.isVibrationEnabled) {
                if (vibrationPattern != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator?.vibrate(VibrationEffect.createWaveform(vibrationPattern, vibrationPatternRepeat))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator?.vibrate(vibrationPattern, vibrationPatternRepeat)
                    }
                } else if (vibrationDurationMs > 0) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val amplitude = if (vibrationAmplitude >= 0) vibrationAmplitude else when (key.lowercase()) {
                            "enter", "backspace", "space" -> 60
                            else -> 30
                        }
                        vibrator?.vibrate(
                            VibrationEffect.createOneShot(
                                vibrationDurationMs.toLong(),
                                amplitude,
                            ),
                        )
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator?.vibrate(vibrationDurationMs.toLong())
                    }
                } else if (vibrationDurationMs < 0) {
                    uiHandler.post { view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP) }
                }
            }

            if (shouldPlayKeyClickSound()) {
                if (keyClickSoundId != 0) {
                    soundPool?.play(keyClickSoundId, soundVolume, soundVolume, 1, 0, soundRate)
                } else {
                    val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    am.playSoundEffect(AudioManager.FX_KEY_CLICK)
                }
            }
        }
    }

    private fun shouldPlayKeyClickSound(): Boolean {
        if (!themeManager.isSoundEnabled) return false
        if (!soundEnabled) return false
        if (soundVolume <= 0f) return false
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false

        val soundEffectsEnabled =
            runCatching {
                Settings.System.getInt(
                    context.contentResolver,
                    Settings.System.SOUND_EFFECTS_ENABLED,
                    1,
                ) == 1
            }.getOrElse { true }

        if (!soundEffectsEnabled) return false

        val systemVolume =
            runCatching { audioManager.getStreamVolume(AudioManager.STREAM_SYSTEM) }.getOrElse { 0 }
        val musicVolume =
            runCatching { audioManager.getStreamVolume(AudioManager.STREAM_MUSIC) }.getOrElse { 0 }
        return systemVolume > 0 || musicVolume > 0
    }
}
