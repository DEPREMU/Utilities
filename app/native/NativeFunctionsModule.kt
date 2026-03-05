package com.package.name

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.package.name.Logger as Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.security.SecureRandom
import java.security.spec.KeySpec
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext

class NativeFunctionsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val CHUNK_SIZE = 1024 * 1024 * 4

    override fun getName() = "NativeFunctionsModule"

    @ReactMethod
    fun requestIgnoreBatteryOptimizations() {
        val intent =
            Intent().apply {
                action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val pm =
                reactApplicationContext.getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
            val isIgnoring = pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
            promise.resolve(isIgnoring)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error checking battery optimization status", e)
            promise.reject(
                "E_CHECK_BATTERY_OPTIMIZATIONS",
                "Error checking battery optimization status: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        try {
            val hasPermission =
                Settings.canDrawOverlays(reactApplicationContext)
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error checking overlay permission", e)
            promise.reject(
                "E_CHECK_PERMISSION",
                "Error checking overlay permission: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        val context = reactApplicationContext
        val currentActivity = context.currentActivity

        if (currentActivity == null) {
            Log.w("NativeFunctionsModule", "Current activity is null. Cannot open settings screen.")
            promise.reject(
                "E_NO_ACTIVITY",
                "Current activity is null. Cannot open settings screen."
            )
            return
        }

        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + context.packageName)
            )

            currentActivity.startActivity(intent)
            promise.resolve("SETTINGS_OPENED")

        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error opening overlay settings", e)
            promise.reject(
                "E_REQUEST_PERMISSION",
                "Error opening overlay settings: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun requestDoNotDisturbPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val nm =
                context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

            if (nm.isNotificationPolicyAccessGranted) {
                promise.resolve("ALREADY_GRANTED")
                return
            }

            val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            promise.resolve("SETTINGS_OPENED")
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error requesting DND permission", e)
            promise.reject(
                "E_REQUEST_DND_PERMISSION",
                "Error requesting DND permission: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun checkDoNotDisturbPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val nm =
                context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            promise.resolve(nm.isNotificationPolicyAccessGranted)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error checking DND permission", e)
            promise.reject(
                "E_CHECK_DND_PERMISSION",
                "Error checking DND permission: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun enableDoNotDisturb(promise: Promise) {
        try {
            val context = reactApplicationContext
            val nm =
                context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

            if (!nm.isNotificationPolicyAccessGranted) {
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                promise.resolve("PERMISSION_REQUIRED")
                return
            }

            nm.setInterruptionFilter(android.app.NotificationManager.INTERRUPTION_FILTER_NONE)
            promise.resolve("ENABLED")
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error enabling DND", e)
            promise.reject("E_ENABLE_DND", "Error enabling DND: ${e.message}", e)
        }
    }

    @ReactMethod
    fun disableDoNotDisturb(promise: Promise) {
        try {
            val context = reactApplicationContext
            val nm =
                context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

            if (!nm.isNotificationPolicyAccessGranted) {
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                promise.resolve("PERMISSION_REQUIRED")
                return
            }

            nm.setInterruptionFilter(android.app.NotificationManager.INTERRUPTION_FILTER_ALL)
            promise.resolve("DISABLED")
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error disabling DND", e)
            promise.reject("E_DISABLE_DND", "Error disabling DND: ${e.message}", e)
        }
    }

    @ReactMethod
    fun openApp(promise: Promise) {
        try {
            val packageName = reactApplicationContext.packageName
            val launchIntent =
                reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)
                    ?.apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    }

            if (launchIntent != null) {
                Log.d("NativeFunctionsModule", "Intent flags: ${launchIntent.flags}")
                Log.d("NativeFunctionsModule", "Starting activity...")
                reactApplicationContext.startActivity(launchIntent)
                Log.d("NativeFunctionsModule", "startActivity called successfully")
                promise.resolve("APP_OPENED")
            } else {
                val errorMessage = "Could not get launch intent for package: $packageName"
                Log.e("NativeFunctionsModule", errorMessage)
                promise.reject("E_NO_LAUNCH_INTENT", errorMessage)
            }
        } catch (e: Exception) {
            val errorMessage = "Error opening app: ${e.message}"
            Log.e("NativeFunctionsModule", errorMessage, e)
            promise.reject("E_OPEN_APP_ERROR", errorMessage, e)
        }
    }

    @ReactMethod
    fun minimizeApp() {
        val context = reactApplicationContext
        val activity = context.currentActivity
        if (activity != null) {
            activity.moveTaskToBack(true)
        }
    }

    @ReactMethod
    fun wasLaunchedFromService(promise: Promise) {
        try {
            val context = reactApplicationContext
            val currentActivity = context.currentActivity
            if (currentActivity != null) {
                val intent = currentActivity.intent
                val launchedFromService = intent.getBooleanExtra("launchedFromService", false)
                promise.resolve(launchedFromService)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestAutoStartPermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val manufacturer = android.os.Build.MANUFACTURER.lowercase()
            
            val intent = when (manufacturer) {
                "xiaomi", "redmi" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.miui.securitycenter",
                            "com.miui.permcenter.autostart.AutoStartManagementActivity"
                        )
                    }
                }
                "oppo" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.coloros.safecenter",
                            "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                        )
                    }
                }
                "vivo" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.vivo.permissionmanager",
                            "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                        )
                    }
                }
                "letv" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.letv.android.letvsafe",
                            "com.letv.android.letvsafe.AutobootManageActivity"
                        )
                    }
                }
                "honor" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.huawei.systemmanager",
                            "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                        )
                    }
                }
                "huawei" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.huawei.systemmanager",
                            "com.huawei.systemmanager.optimize.process.ProtectActivity"
                        )
                    }
                }
                "asus" -> {
                    Intent().apply {
                        component = android.content.ComponentName(
                            "com.asus.mobilemanager",
                            "com.asus.mobilemanager.MainActivity"
                        )
                    }
                }
                else -> {
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:${context.packageName}")
                    }
                }
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            try {
                context.startActivity(intent)
                promise.resolve("SETTINGS_OPENED")
            } catch (e: Exception) {
                Log.w("NativeFunctionsModule", "Failed to open specific autostart settings, trying generic: ${e.message}")
                val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
                promise.resolve("GENERIC_SETTINGS_OPENED")
            }
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error requesting autostart permission", e)
            promise.reject(
                "E_REQUEST_AUTOSTART",
                "Error requesting autostart permission: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun isDoNotDisturbEnabled(promise: Promise) {
        try {
            val context = reactApplicationContext
            val nm =
                context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            val isEnabled = nm.currentInterruptionFilter != android.app.NotificationManager.INTERRUPTION_FILTER_ALL
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error checking DND status", e)
            promise.reject(
                "E_CHECK_DND_STATUS",
                "Error checking DND status: ${e.message}",
                e
            )   
        }
    }

    private fun sendProgressEvent(eventName: String, progress: Int, filePath: String) {
        try {
            val params = Arguments.createMap().apply {
                putInt("progress", progress)
                putString("filePath", filePath)
            }
            BackgroundServiceModule.sendEvent(eventName, params)
        } catch (e: Exception) {
            Log.e("NativeFunctionsModule", "Error sending progress event", e)
        }
    }

    @ReactMethod
    fun encryptFile(inputPath: String, outputPath: String, password: String, promise: Promise) {
        scope.launch {
            try {
                val inputFile = File(inputPath)
                val outputFile = File(outputPath)

                if (!inputFile.exists()) {
                    promise.reject("ERROR", "Input file does not exist")
                    return@launch
                }

                outputFile.parentFile?.mkdirs()

                val salt = ByteArray(16).apply { SecureRandom().nextBytes(this) }
                val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                val spec: KeySpec = PBEKeySpec(password.toCharArray(), salt, 100000, 256)
                val secretKey = SecretKeySpec(factory.generateSecret(spec).encoded, "AES")

                val totalBytes = inputFile.length()
                var bytesProcessed = 0L
                var lastProgress = 0

                FileInputStream(inputFile).use { fis: FileInputStream ->
                    FileOutputStream(outputFile).use { fos: FileOutputStream ->
                        DataOutputStream(fos).use { dos: DataOutputStream ->
                            
                            dos.write(salt)

                            val buffer = ByteArray(CHUNK_SIZE)
                            var bytesRead: Int

                            while (fis.read(buffer).also { bytesRead = it } != -1) {
                                val iv = ByteArray(12).apply { SecureRandom().nextBytes(this) }
                                
                                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                                val gcmSpec = GCMParameterSpec(128, iv)
                                cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec)

                                val encryptedBytes = cipher.doFinal(buffer, 0, bytesRead)

                                dos.writeInt(encryptedBytes.size)
                                dos.write(iv)
                                dos.write(encryptedBytes)

                                bytesProcessed += bytesRead
                                val progress = ((bytesProcessed.toDouble() / totalBytes) * 100).toInt()
                                if (progress > lastProgress) {
                                    lastProgress = progress
                                    withContext(Dispatchers.Main) {
                                        sendProgressEvent("FileEncryptionProgress", progress, inputPath)
                                    }
                                }
                            }
                        }
                    }
                }

                withContext(Dispatchers.Main) {
                    sendProgressEvent("FileEncryptionProgress", 100, inputPath)
                }
                promise.resolve(true)

            } catch (e: Exception) {
                e.printStackTrace()
                val outputFile = File(outputPath)
                if (outputFile.exists()) outputFile.delete()
                promise.reject("ENCRYPT_ERROR", e.localizedMessage, e)
            }
        }
    }

    @ReactMethod
    fun decryptFile(inputPath: String, outputPath: String, password: String, promise: Promise) {
        scope.launch {
            try {
                val inputFile = File(inputPath)
                val outputFile = File(outputPath)

                if (!inputFile.exists()) {
                    promise.reject("ERROR", "Input file does not exist")
                    return@launch
                }

                val fis = FileInputStream(inputFile)
                val dis = DataInputStream(fis)
                
                val salt = ByteArray(16)
                if (dis.read(salt) != 16) {
                    dis.close()
                    promise.reject("ERROR", "Invalid file format")
                    return@launch
                }

                val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                val spec: KeySpec = PBEKeySpec(password.toCharArray(), salt, 100000, 256)
                val secretKey = SecretKeySpec(factory.generateSecret(spec).encoded, "AES")

                val totalBytes = inputFile.length()
                var bytesProcessed = 16L
                var lastProgress = 0

                FileOutputStream(outputFile).use { fos: FileOutputStream ->
                    try {
                        while (true) {
                            try {
                                val chunkSize = dis.readInt()
                                val iv = ByteArray(12)
                                dis.readFully(iv)
                                val encryptedBytes = ByteArray(chunkSize)
                                dis.readFully(encryptedBytes)

                                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                                val gcmSpec = GCMParameterSpec(128, iv)
                                cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)

                                val decryptedBytes = cipher.doFinal(encryptedBytes)
                                fos.write(decryptedBytes)

                                bytesProcessed += (4 + 12 + chunkSize)
                                val progress = ((bytesProcessed.toDouble() / totalBytes) * 100).toInt()
                                if (progress > lastProgress) {
                                    lastProgress = progress
                                    withContext(Dispatchers.Main) {
                                        sendProgressEvent("FileDecryptionProgress", progress, inputPath)
                                    }
                                }
                            } catch (e: java.io.EOFException) {
                                break
                            }
                        }
                    } catch (e: Exception) {
                        throw e
                    }
                }
                
                dis.close()

                withContext(Dispatchers.Main) {
                    sendProgressEvent("FileDecryptionProgress", 100, inputPath)
                }
                promise.resolve(true)

            } catch (e: Exception) {
                e.printStackTrace()
                val outputFile = File(outputPath)
                if (outputFile.exists()) outputFile.delete()
                promise.reject("DECRYPT_ERROR", "Error decrypting: ${e.message}", e)
            }
        }
    }
}