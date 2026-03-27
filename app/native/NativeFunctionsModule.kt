package com.package.name

import android.app.NotificationManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
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
import kotlinx.coroutines.withContext

class NativeFunctionsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val CHUNK_SIZE = 1024 * 1024 * 4
    private val GCM_IV_LENGTH = 12
    private val SALT_LENGTH = 16
    private val MAX_ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + 64
    private val TAG = "NativeFunctionsModule"

    override fun getName() = "NativeFunctionsModule"

    @ReactMethod
    fun requestIgnoreBatteryOptimizations() {
        try {
            val context = reactApplicationContext
            val intents = listOf(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                },
                Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                }
            )

            startFirstAvailableIntent(intents)
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting battery optimizations", e)
        }
    }

    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val context = reactApplicationContext
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val isIgnoringOptimizations =
                powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: false
            promise.resolve(isIgnoringOptimizations)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking battery optimization", e)
            promise.reject(
                "E_CHECK_BATTERY_OPTIMIZATION",
                "Error checking battery optimization: ${e.message}",
                e
            )
        }
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        try {
            val hasPermission = Settings.canDrawOverlays(reactApplicationContext)

            promise.resolve(hasPermission)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking overlay permission", e)
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

        if (Settings.canDrawOverlays(context)) {
            promise.resolve("ALREADY_GRANTED")
            return
        }

        try {
            val intents = listOf(
                Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}")),
                Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION),
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                }
            )

            if (startFirstAvailableIntent(intents)) {
                promise.resolve("SETTINGS_OPENED")
            } else {
                promise.reject(
                    "E_REQUEST_PERMISSION",
                    "No compatible settings screen found for overlay permission."
                )
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error opening overlay settings", e)
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
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            if (nm == null) {
                promise.reject("E_REQUEST_DND_PERMISSION", "NotificationManager not available")
                return
            }

            if (nm.isNotificationPolicyAccessGranted) {
                promise.resolve("ALREADY_GRANTED")
                return
            }

            val opened = startFirstAvailableIntent(
                listOf(
                    Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS),
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:${context.packageName}")
                    }
                )
            )

            if (opened) {
                promise.resolve("SETTINGS_OPENED")
            } else {
                promise.reject("E_REQUEST_DND_PERMISSION", "Could not open DND settings")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting DND permission", e)
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
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            if (nm == null) {
                promise.reject("E_CHECK_DND_PERMISSION", "NotificationManager not available")
                return
            }
            promise.resolve(nm.isNotificationPolicyAccessGranted)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking DND permission", e)
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
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            if (nm == null) {
                promise.reject("E_ENABLE_DND", "NotificationManager not available")
                return
            }

            if (!nm.isNotificationPolicyAccessGranted) {
                val opened = startFirstAvailableIntent(
                    listOf(
                        Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS),
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                            data = Uri.parse("package:${context.packageName}")
                        }
                    )
                )
                if (opened) {
                    promise.resolve("PERMISSION_REQUIRED")
                } else {
                    promise.reject("E_ENABLE_DND", "Permission required and settings could not be opened")
                }
                return
            }

            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
            promise.resolve("ENABLED")
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling DND", e)
            promise.reject("E_ENABLE_DND", "Error enabling DND: ${e.message}", e)
        }
    }

    @ReactMethod
    fun disableDoNotDisturb(promise: Promise) {
        try {
            val context = reactApplicationContext
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            if (nm == null) {
                promise.reject("E_DISABLE_DND", "NotificationManager not available")
                return
            }

            if (!nm.isNotificationPolicyAccessGranted) {
                val opened = startFirstAvailableIntent(
                    listOf(
                        Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS),
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                            data = Uri.parse("package:${context.packageName}")
                        }
                    )
                )
                if (opened) {
                    promise.resolve("PERMISSION_REQUIRED")
                } else {
                    promise.reject("E_DISABLE_DND", "Permission required and settings could not be opened")
                }
                return
            }

            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
            promise.resolve("DISABLED")
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling DND", e)
            promise.reject("E_DISABLE_DND", "Error disabling DND: ${e.message}", e)
        }
    }

    @ReactMethod
    fun openApp(promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageName = context.packageName
            val launchIntentCandidates = listOfNotNull(
                context.packageManager.getLaunchIntentForPackage(packageName),
                context.packageManager.getLeanbackLaunchIntentForPackage(packageName),
                Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                    `package` = packageName
                }
            )

            val launchIntent = launchIntentCandidates.firstOrNull { canHandleIntent(it) }?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            }

            if (launchIntent != null) {
                Log.d(TAG, "Intent flags: ${launchIntent.flags}")
                Log.d(TAG, "Starting activity...")
                context.startActivity(launchIntent)
                Log.d(TAG, "startActivity called successfully")
                promise.resolve("APP_OPENED")
            } else {
                val errorMessage = "Could not get launch intent for package: $packageName"
                Log.e(TAG, errorMessage)
                promise.reject("E_NO_LAUNCH_INTENT", errorMessage)
            }
        } catch (e: Exception) {
            val errorMessage = "Error opening app: ${e.message}"
            Log.e(TAG, errorMessage, e)
            promise.reject("E_OPEN_APP_ERROR", errorMessage, e)
        }
    }

    @ReactMethod
    fun minimizeApp() {
        val context = reactApplicationContext
        val activity = context.currentActivity
        if (activity != null) {
            activity.moveTaskToBack(true)
            return
        }

        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        if (!safeStartActivity(homeIntent)) {
            Log.w(TAG, "Could not minimize app on this device")
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
            val manufacturer = Build.MANUFACTURER.lowercase()

            val manufacturerIntents = when (manufacturer) {
                "xiaomi", "redmi", "poco" -> listOf(
                    componentIntent(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity"
                    ),
                    componentIntent(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.permissions.PermissionsEditorActivity"
                    ),
                    componentIntent(
                        "com.miui.securitycenter",
                        "com.miui.appmanager.ApplicationsDetailsActivity"
                    )
                )
                "oppo", "oneplus", "realme" -> listOf(
                    componentIntent(
                        "com.coloros.safecenter",
                        "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                    ),
                    componentIntent(
                        "com.oplus.safecenter",
                        "com.oplus.safecenter.startupapp.StartupAppListActivity"
                    ),
                    componentIntent(
                        "com.coloros.oppoguardelf",
                        "com.coloros.powermanager.fuelgaue.PowerUsageModelActivity"
                    )
                )
                "vivo", "iqoo" -> listOf(
                    componentIntent(
                        "com.vivo.permissionmanager",
                        "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                    ),
                    componentIntent(
                        "com.iqoo.secure",
                        "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"
                    ),
                    componentIntent(
                        "com.vivo.permissionmanager",
                        "com.vivo.permissionmanager.activity.PurviewTabActivity"
                    )
                )
                "letv" -> listOf(
                    componentIntent(
                        "com.letv.android.letvsafe",
                        "com.letv.android.letvsafe.AutobootManageActivity"
                    )
                )
                "honor", "huawei" -> listOf(
                    componentIntent(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.optimize.process.ProtectActivity"
                    ),
                    componentIntent(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                    ),
                    componentIntent(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity"
                    )
                )
                "asus" -> listOf(
                    componentIntent(
                        "com.asus.mobilemanager",
                        "com.asus.mobilemanager.MainActivity"
                    )
                )
                "samsung" -> listOf(
                    componentIntent(
                        "com.samsung.android.lool",
                        "com.samsung.android.sm.ui.battery.BatteryActivity"
                    ),
                    componentIntent(
                        "com.samsung.android.sm",
                        "com.samsung.android.sm.app.dashboard.SmartManagerDashBoardActivity"
                    ),
                    componentIntent(
                        "com.samsung.android.lool",
                        "com.samsung.android.sm.ui.ram.AutoRunActivity"
                    )
                )
                "nokia" -> listOf(
                    componentIntent(
                        "com.evenwell.powersaving.g3",
                        "com.evenwell.powersaving.g3.exception.PowerSaverExceptionActivity"
                    )
                )
                "motorola", "lenovo" -> listOf(
                    componentIntent(
                        "com.motorola.ccc.ota",
                        "com.motorola.ccc.ota.ui.MainActivity"
                    )
                )
                else -> emptyList()
            }

            val genericFallbacks = mutableListOf<Intent>()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                genericFallbacks.add(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }

            genericFallbacks.add(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                }
            )

            val opened = startFirstAvailableIntent(manufacturerIntents + genericFallbacks)

            if (opened) {
                promise.resolve("SETTINGS_OPENED")
            } else {
                promise.reject(
                    "E_REQUEST_AUTOSTART",
                    "No compatible autostart settings screen found on this device."
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting autostart permission", e)
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
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            if (nm == null) {
                promise.reject("E_CHECK_DND_STATUS", "NotificationManager not available")
                return
            }

            val isEnabled = nm.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking DND status", e)
            promise.reject(
                "E_CHECK_DND_STATUS",
                "Error checking DND status: ${e.message}",
                e
            )   
        }
    }

    private fun componentIntent(packageName: String, className: String): Intent {
        return Intent().apply {
            component = ComponentName(packageName, className)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    private fun canHandleIntent(intent: Intent): Boolean {
        val packageManager = reactApplicationContext.packageManager
        return intent.resolveActivity(packageManager) != null
    }

    private fun safeStartActivity(intent: Intent): Boolean {
        val context = reactApplicationContext
        return try {
            val normalizedIntent = Intent(intent).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (!canHandleIntent(normalizedIntent)) {
                false
            } else {
                context.startActivity(normalizedIntent)
                true
            }
        } catch (e: ActivityNotFoundException) {
            Log.w(TAG, "Activity not found for intent: ${intent.action}", e)
            false
        } catch (e: SecurityException) {
            Log.w(TAG, "Security exception starting intent: ${intent.action}", e)
            false
        } catch (e: Exception) {
            Log.w(TAG, "Unexpected error starting intent: ${intent.action}", e)
            false
        }
    }

    private fun startFirstAvailableIntent(intents: List<Intent>): Boolean {
        for (intent in intents) {
            if (safeStartActivity(intent)) {
                return true
            }
        }
        return false
    }

    private fun isSamePath(pathA: String, pathB: String): Boolean {
        return try {
            File(pathA).canonicalPath == File(pathB).canonicalPath
        } catch (_: Exception) {
            pathA == pathB
        }
    }

    private fun deleteFileQuietly(file: File) {
        try {
            if (file.exists()) {
                file.delete()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not delete file: ${file.absolutePath}", e)
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
            Log.e(TAG, "Error sending progress event", e)
        }
    }

    @ReactMethod
    fun encryptFile(inputPath: String, outputPath: String, password: String, promise: Promise) {
        scope.launch {
            try {
                val inputFile = File(inputPath)
                val outputFile = File(outputPath)

                if (password.isBlank()) {
                    promise.reject("ENCRYPT_ERROR", "Password cannot be empty")
                    return@launch
                }

                if (!inputFile.exists() || !inputFile.isFile || !inputFile.canRead()) {
                    promise.reject("ENCRYPT_ERROR", "Input file does not exist or cannot be read")
                    return@launch
                }

                if (isSamePath(inputPath, outputPath)) {
                    promise.reject("ENCRYPT_ERROR", "Input and output path must be different")
                    return@launch
                }

                outputFile.parentFile?.mkdirs()
                if (outputFile.exists() && !outputFile.canWrite()) {
                    promise.reject("ENCRYPT_ERROR", "Output file cannot be written")
                    return@launch
                }

                val salt = ByteArray(SALT_LENGTH).apply { SecureRandom().nextBytes(this) }
                val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                val spec: KeySpec = PBEKeySpec(password.toCharArray(), salt, 100000, 256)
                val secretKey = SecretKeySpec(factory.generateSecret(spec).encoded, "AES")

                val totalBytes = inputFile.length()
                var bytesProcessed = 0L
                var lastProgress = 0

                withContext(Dispatchers.Main) {
                    sendProgressEvent("FileEncryptionProgress", 0, inputPath)
                }

                FileInputStream(inputFile).use { fis: FileInputStream ->
                    FileOutputStream(outputFile).use { fos: FileOutputStream ->
                        DataOutputStream(fos).use { dos: DataOutputStream ->
                            dos.write(salt)

                            val buffer = ByteArray(CHUNK_SIZE)
                            var bytesRead: Int

                            while (fis.read(buffer).also { bytesRead = it } != -1) {
                                val iv = ByteArray(GCM_IV_LENGTH).apply { SecureRandom().nextBytes(this) }

                                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                                val gcmSpec = GCMParameterSpec(128, iv)
                                cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec)

                                val encryptedBytes = cipher.doFinal(buffer, 0, bytesRead)

                                dos.writeInt(encryptedBytes.size)
                                dos.write(iv)
                                dos.write(encryptedBytes)

                                bytesProcessed += bytesRead
                                val progress = if (totalBytes <= 0L) {
                                    100
                                } else {
                                    (((bytesProcessed.toDouble() / totalBytes) * 100).toInt()).coerceIn(0, 99)
                                }
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
                Log.e(TAG, "Error encrypting file", e)
                deleteFileQuietly(File(outputPath))
                promise.reject("ENCRYPT_ERROR", e.localizedMessage ?: "Unknown encryption error", e)
            }
        }
    }

    @ReactMethod
    fun decryptFile(inputPath: String, outputPath: String, password: String, promise: Promise) {
        scope.launch {
            try {
                val inputFile = File(inputPath)
                val outputFile = File(outputPath)

                if (password.isBlank()) {
                    promise.reject("DECRYPT_ERROR", "Password cannot be empty")
                    return@launch
                }

                if (!inputFile.exists() || !inputFile.isFile || !inputFile.canRead()) {
                    promise.reject("DECRYPT_ERROR", "Input file does not exist or cannot be read")
                    return@launch
                }

                if (isSamePath(inputPath, outputPath)) {
                    promise.reject("DECRYPT_ERROR", "Input and output path must be different")
                    return@launch
                }

                outputFile.parentFile?.mkdirs()
                if (outputFile.exists() && !outputFile.canWrite()) {
                    promise.reject("DECRYPT_ERROR", "Output file cannot be written")
                    return@launch
                }

                withContext(Dispatchers.Main) {
                    sendProgressEvent("FileDecryptionProgress", 0, inputPath)
                }

                FileInputStream(inputFile).use { fis ->
                    DataInputStream(fis).use { dis ->
                        val salt = ByteArray(SALT_LENGTH)
                        if (dis.read(salt) != SALT_LENGTH) {
                            promise.reject("DECRYPT_ERROR", "Invalid file format")
                            return@launch
                        }

                        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                        val spec: KeySpec = PBEKeySpec(password.toCharArray(), salt, 100000, 256)
                        val secretKey = SecretKeySpec(factory.generateSecret(spec).encoded, "AES")

                        val totalBytes = inputFile.length()
                        var bytesProcessed = SALT_LENGTH.toLong()
                        var lastProgress = 0

                        FileOutputStream(outputFile).use { fos ->
                            while (true) {
                                try {
                                    val chunkSize = dis.readInt()
                                    if (chunkSize <= 0 || chunkSize > MAX_ENCRYPTED_CHUNK_SIZE) {
                                        throw IllegalArgumentException("Invalid encrypted chunk size: $chunkSize")
                                    }

                                    val iv = ByteArray(GCM_IV_LENGTH)
                                    dis.readFully(iv)
                                    val encryptedBytes = ByteArray(chunkSize)
                                    dis.readFully(encryptedBytes)

                                    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                                    val gcmSpec = GCMParameterSpec(128, iv)
                                    cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)

                                    val decryptedBytes = cipher.doFinal(encryptedBytes)
                                    fos.write(decryptedBytes)

                                    bytesProcessed += (4 + GCM_IV_LENGTH + chunkSize)
                                    val progress = if (totalBytes <= 0L) {
                                        100
                                    } else {
                                        (((bytesProcessed.toDouble() / totalBytes) * 100).toInt()).coerceIn(0, 99)
                                    }

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
                        }
                    }
                }

                withContext(Dispatchers.Main) {
                    sendProgressEvent("FileDecryptionProgress", 100, inputPath)
                }
                promise.resolve(true)

            } catch (e: Exception) {
                Log.e(TAG, "Error decrypting file", e)
                deleteFileQuietly(File(outputPath))
                promise.reject("DECRYPT_ERROR", "Error decrypting: ${e.message}", e)
            }
        }
    }
}