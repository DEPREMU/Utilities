package com.package.name

import android.net.Uri
import android.os.Environment
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

class VaultCryptoModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val NAME = "VaultCryptoModule"
    private const val TAG_LENGTH_BITS = 128
    private const val NONCE_LENGTH_BYTES = 12
    private const val SCHEMA_VERSION = 1
    private const val VERIFIER_LABEL = "vault-verifier"
  }

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private val jobs = mutableMapOf<String, Job>()

  private var sessionMasterKey: ByteArray? = null
  private var sessionKeyId: String? = null
  private var expiresAtMs: Long = 0

  override fun getName(): String = NAME

  private fun nowMs(): Long = System.currentTimeMillis()

  private fun isUnlocked(): Boolean {
    val key = sessionMasterKey ?: return false
    if (key.isEmpty()) return false
    if (nowMs() >= expiresAtMs) {
      lockInternal()
      return false
    }
    return true
  }

  private fun lockInternal() {
    sessionMasterKey = null
    sessionKeyId = null
    expiresAtMs = 0
  }

  private fun getVaultRootDir(): File {
    val ext = reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
    val base = ext ?: reactApplicationContext.filesDir
    val vault = File(base, "vault")
    if (!vault.exists()) vault.mkdirs()
    return vault
  }

  private fun emitProgress(
    jobId: String,
    fileId: String?,
    phase: String,
    writtenBytes: Long,
    totalBytes: Long?
  ) {
    try {
      val ctx = reactApplicationContext
      if (!ctx.hasActiveReactInstance()) return

      val params = Arguments.createMap().apply {
        putString("jobId", jobId)
        if (fileId != null) putString("fileId", fileId)
        putString("phase", phase)
        putDouble("writtenBytes", writtenBytes.toDouble())
        if (totalBytes != null) {
          putDouble("totalBytes", totalBytes.toDouble())
          if (totalBytes > 0) putDouble("percent", (writtenBytes.toDouble() / totalBytes.toDouble()) * 100.0)
        }
      }

      ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("vault-progress", params)
    } catch (e: Exception) {
      Log.w(NAME, "Failed to emit vault progress", e)
    }
  }

  private fun bytesToHex(bytes: ByteArray): String {
    val sb = StringBuilder(bytes.size * 2)
    for (b in bytes) sb.append(String.format("%02x", b))
    return sb.toString()
  }

  private fun sha256Base64(bytes: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256")
    return Base64.encodeToString(digest.digest(bytes), Base64.NO_WRAP)
  }

  private fun pbkdf2Sha256(password: String, salt: ByteArray, iterations: Int, keyLenBytes: Int): ByteArray {
    val spec = PBEKeySpec(password.toCharArray(), salt, iterations, keyLenBytes * 8)
    val skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
    return skf.generateSecret(spec).encoded
  }

  private fun aesGcmEncrypt(key: ByteArray, nonce: ByteArray, plain: ByteArray): ByteArray {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG_LENGTH_BITS, nonce))
    return cipher.doFinal(plain)
  }

  private fun aesGcmDecrypt(key: ByteArray, nonce: ByteArray, cipherTextAndTag: ByteArray): ByteArray {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG_LENGTH_BITS, nonce))
    return cipher.doFinal(cipherTextAndTag)
  }

  @ReactMethod
  fun ensureInitialized(promise: Promise) {
    try {
      val root = getVaultRootDir()
      val result = Arguments.createMap().apply {
        putBoolean("ok", true)
        putString("vaultRootPath", root.absolutePath)
      }
      promise.resolve(result)
    } catch (e: Exception) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", e.message ?: "Unknown error")
      }
      promise.resolve(result)
    }
  }

  @ReactMethod
  fun lock() {
    lockInternal()
  }

  @ReactMethod
  fun unlock(password: String, wrappedMasterKeyJson: String?, authVerifierJson: String?, autoLockSeconds: Int, promise: Promise) {
    scope.launch {
      try {
        val now = nowMs()

        if (wrappedMasterKeyJson.isNullOrBlank() || authVerifierJson.isNullOrBlank()) {
          val masterKey = ByteArray(32)
          SecureRandom().nextBytes(masterKey)
          val keyId = UUID.randomUUID().toString()

          val salt = ByteArray(16)
          SecureRandom().nextBytes(salt)
          val iterations = 120_000
          val wrapKey = pbkdf2Sha256(password, salt, iterations, 32)

          val nonce = ByteArray(NONCE_LENGTH_BYTES)
          SecureRandom().nextBytes(nonce)
          val wrappedCipher = aesGcmEncrypt(wrapKey, nonce, masterKey)

          val wrappedObj = JSONObject().apply {
            put("schemaVersion", SCHEMA_VERSION)
            put("keyId", keyId)
            put("wrappedKeyBase64", Base64.encodeToString(wrappedCipher, Base64.NO_WRAP))
            put("wrapNonceBase64", Base64.encodeToString(nonce, Base64.NO_WRAP))
            put("kdf", JSONObject().apply {
              put("algorithm", "pbkdf2")
              put("saltBase64", Base64.encodeToString(salt, Base64.NO_WRAP))
              put("iterations", iterations)
              put("hash", "SHA-256")
              put("keyLen", 32)
            })
          }

          val verifierBytes = sha256Base64(wrapKey + VERIFIER_LABEL.toByteArray())
          val verifierObj = JSONObject().apply {
            put("schemaVersion", SCHEMA_VERSION)
            put("method", "password")
            put("kdf", wrappedObj.getJSONObject("kdf"))
            put("verifierBase64", verifierBytes)
          }

          sessionMasterKey = masterKey
          sessionKeyId = keyId
          expiresAtMs = now + (autoLockSeconds.toLong() * 1000L)

          val result = Arguments.createMap().apply {
            putBoolean("ok", true)
            putBoolean("created", true)
            putString("keyId", keyId)
            putString("wrappedMasterKeyJson", wrappedObj.toString())
            putString("authVerifierJson", verifierObj.toString())
          }

          promise.resolve(result)
          return@launch
        }

        val wrappedObj = JSONObject(wrappedMasterKeyJson)
        val verifierObj = JSONObject(authVerifierJson)

        val kdfObj = verifierObj.getJSONObject("kdf")
        if (kdfObj.getString("algorithm") != "pbkdf2") {
          val result = Arguments.createMap().apply {
            putBoolean("ok", false)
            putString("error", "Unsupported KDF")
          }
          promise.resolve(result)
          return@launch
        }

        val salt = Base64.decode(kdfObj.getString("saltBase64"), Base64.NO_WRAP)
        val iterations = kdfObj.getInt("iterations")
        val wrapKey = pbkdf2Sha256(password, salt, iterations, 32)

        val computedVerifier = sha256Base64(wrapKey + VERIFIER_LABEL.toByteArray())
        val expectedVerifier = verifierObj.getString("verifierBase64")

        if (computedVerifier != expectedVerifier) {
          val result = Arguments.createMap().apply {
            putBoolean("ok", false)
            putString("error", "Invalid password")
          }
          promise.resolve(result)
          return@launch
        }

        val nonce = Base64.decode(wrappedObj.getString("wrapNonceBase64"), Base64.NO_WRAP)
        val wrappedCipher = Base64.decode(wrappedObj.getString("wrappedKeyBase64"), Base64.NO_WRAP)
        val masterKey = aesGcmDecrypt(wrapKey, nonce, wrappedCipher)

        val keyId = wrappedObj.getString("keyId")

        sessionMasterKey = masterKey
        sessionKeyId = keyId
        expiresAtMs = now + (autoLockSeconds.toLong() * 1000L)

        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
          putBoolean("created", false)
          putString("keyId", keyId)
        }
        promise.resolve(result)
      } catch (e: Exception) {
        val result = Arguments.createMap().apply {
          putBoolean("ok", false)
          putString("error", e.message ?: "Unknown error")
        }
        promise.resolve(result)
      }
    }
  }

  @ReactMethod
  fun cancelJob(jobId: String, promise: Promise) {
    val job = jobs[jobId]
    if (job == null) {
      promise.resolve(false)
      return
    }

    job.cancel(CancellationException("Canceled"))
    jobs.remove(jobId)
    promise.resolve(true)
  }

  @ReactMethod
  fun cleanTempSession(sessionId: String, promise: Promise) {
    try {
      val dir = File(getVaultRootDir(), "temp/session_$sessionId")
      dir.deleteRecursively()
      promise.resolve(true)
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  private fun openInputStream(uriStr: String): InputStream {
    val uri = Uri.parse(uriStr)
    return reactApplicationContext.contentResolver.openInputStream(uri)
      ?: throw IllegalArgumentException("Cannot open input stream")
  }

  private fun getDisplayName(uriStr: String): String {
    val uri = Uri.parse(uriStr)
    val cursor = reactApplicationContext.contentResolver.query(uri, null, null, null, null)
    cursor?.use {
      val nameIndex = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
      if (nameIndex >= 0 && it.moveToFirst()) {
        val v = it.getString(nameIndex)
        if (!v.isNullOrBlank()) return v
      }
    }
    return uri.lastPathSegment ?: "file"
  }

  private fun getSize(uriStr: String): Long? {
    val uri = Uri.parse(uriStr)
    val cursor = reactApplicationContext.contentResolver.query(uri, null, null, null, null)
    cursor?.use {
      val sizeIndex = it.getColumnIndex(android.provider.OpenableColumns.SIZE)
      if (sizeIndex >= 0 && it.moveToFirst()) {
        val v = it.getLong(sizeIndex)
        if (v >= 0) return v
      }
    }
    return null
  }

  @ReactMethod
  fun encryptUris(jobId: String, folderId: String, inputUris: ReadableArray, promise: Promise) {
    if (!isUnlocked()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val masterKey = sessionMasterKey
    val keyId = sessionKeyId

    if (masterKey == null || keyId.isNullOrBlank()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val job = scope.launch {
      try {
        val root = getVaultRootDir()
        val itemsDir = File(File(File(root, "folders"), folderId), "items")
        if (!itemsDir.exists()) itemsDir.mkdirs()

        val results = Arguments.createArray()

        for (i in 0 until inputUris.size()) {
          ensureActive()

          val uriStr = inputUris.getString(i) ?: continue
          val fileId = UUID.randomUUID().toString()

          val name = getDisplayName(uriStr)
          val totalPlain = getSize(uriStr)

          val nonce = ByteArray(NONCE_LENGTH_BYTES)
          SecureRandom().nextBytes(nonce)

          val cipher = Cipher.getInstance("AES/GCM/NoPadding")
          cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(masterKey, "AES"), GCMParameterSpec(TAG_LENGTH_BITS, nonce))

          val digest = MessageDigest.getInstance("SHA-256")

          val outFile = File(itemsDir, "$fileId.enc")
          var writtenCipher: Long = 0
          var lastEmit: Long = 0

          openInputStream(uriStr).use { input ->
            FileOutputStream(outFile).use { output ->
              val buf = ByteArray(64 * 1024)
              while (true) {
                ensureActive()
                val read = input.read(buf)
                if (read <= 0) break

                val out = cipher.update(buf, 0, read)
                if (out != null && out.isNotEmpty()) {
                  output.write(out)
                  digest.update(out)
                  writtenCipher += out.size
                }

                val now = nowMs()
                if (now - lastEmit >= 200) {
                  lastEmit = now
                  emitProgress(jobId, fileId, "encrypt", writtenCipher, totalPlain)
                }
              }

              val finalBytes = cipher.doFinal()
              output.write(finalBytes)
              digest.update(finalBytes)
              writtenCipher += finalBytes.size
            }
          }

          emitProgress(jobId, fileId, "encrypt", writtenCipher, totalPlain)

          val hashHex = bytesToHex(digest.digest())

          val resultItem = Arguments.createMap().apply {
            putString("fileId", fileId)
            putString("keyId", keyId)
            putString("originalName", name)
            putString("nonceBase64", Base64.encodeToString(nonce, Base64.NO_WRAP))
            putString("hashCipherHex", hashHex)
            putString("cipherPath", outFile.absolutePath)
            putDouble("sizePlainBytes", (totalPlain ?: -1L).toDouble())
            putDouble("sizeCipherBytes", writtenCipher.toDouble())
          }

          results.pushMap(resultItem)
        }

        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
          putArray("results", results)
        }

        promise.resolve(result)
      } catch (e: CancellationException) {
        val result = Arguments.createMap().apply {
          putBoolean("ok", false)
          putString("error", "Canceled")
        }
        promise.resolve(result)
      } catch (e: Exception) {
        val result = Arguments.createMap().apply {
          putBoolean("ok", false)
          putString("error", e.message ?: "Unknown error")
        }
        promise.resolve(result)
      } finally {
        jobs.remove(jobId)
      }
    }

    jobs[jobId] = job
  }

  @ReactMethod
  fun decryptToTemp(jobId: String, folderId: String, itemId: String, nonceBase64: String, outputName: String, sessionId: String, promise: Promise) {
    if (!isUnlocked()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val masterKey = sessionMasterKey ?: run {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val job = scope.launch {
      try {
        val root = getVaultRootDir()
        val encFile = File(File(File(File(root, "folders"), folderId), "items"), "$itemId.enc")
        if (!encFile.exists()) throw IllegalArgumentException("Cipher file not found")

        val tempDir = File(File(root, "temp"), "session_$sessionId")
        if (!tempDir.exists()) tempDir.mkdirs()

        val outFile = File(tempDir, outputName)

        val nonce = Base64.decode(nonceBase64, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(masterKey, "AES"), GCMParameterSpec(TAG_LENGTH_BITS, nonce))

        val total = encFile.length()
        var readBytes: Long = 0
        var lastEmit: Long = 0

        encFile.inputStream().use { input ->
          FileOutputStream(outFile).use { output ->
            val buf = ByteArray(64 * 1024)
            while (true) {
              ensureActive()
              val read = input.read(buf)
              if (read <= 0) break

              readBytes += read.toLong()

              val out = cipher.update(buf, 0, read)
              if (out != null && out.isNotEmpty()) output.write(out)

              val now = nowMs()
              if (now - lastEmit >= 200) {
                lastEmit = now
                emitProgress(jobId, itemId, "decrypt", readBytes, total)
              }
            }

            val finalBytes = cipher.doFinal()
            if (finalBytes.isNotEmpty()) output.write(finalBytes)
          }
        }

        emitProgress(jobId, itemId, "decrypt", total, total)

        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
          putString("tempPath", outFile.absolutePath)
        }
        promise.resolve(result)
      } catch (e: CancellationException) {
        val result = Arguments.createMap().apply {
          putBoolean("ok", false)
          putString("error", "Canceled")
        }
        promise.resolve(result)
      } catch (e: Exception) {
        val result = Arguments.createMap().apply {
          putBoolean("ok", false)
          putString("error", e.message ?: "Unknown error")
        }
        promise.resolve(result)
      } finally {
        jobs.remove(jobId)
      }
    }

    jobs[jobId] = job
  }
}
