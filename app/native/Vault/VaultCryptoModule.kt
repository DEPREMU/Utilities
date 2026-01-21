package com.package.name

import android.net.Uri
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import androidx.documentfile.provider.DocumentFile
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import kotlin.text.Charsets
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import org.bouncycastle.crypto.generators.SCrypt

class VaultCryptoModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val NAME = "VaultCryptoModule"
    private const val TAG_LENGTH_BITS = 128
    private const val TAG_LENGTH_BYTES = TAG_LENGTH_BITS / 8
    private const val NONCE_LENGTH_BYTES = 12
    private const val SCHEMA_VERSION = 1
    private const val VERIFIER_LABEL = "vault-verifier"
    private const val MAX_TEMP_TEXT_BYTES = 1024 * 1024
  }

  @ReactMethod
  fun purgeTempDirectory(promise: Promise) {
    scope.launch {
      try {
        val tempDir = File(getVaultRootDir(), "temp")
        if (tempDir.exists()) tempDir.deleteRecursively()
        tempDir.mkdirs()
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }
  }

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private val jobs = mutableMapOf<String, Job>()

  private var didCleanupTempOnInit: Boolean = false

  private var vaultRootDirOverride: File? = null

  private var sessionMasterKey: ByteArray? = null
  private var sessionKeyId: String? = null
  private var expiresAtMs: Long = 0

  override fun getName(): String = NAME

  // React Native event emitter compatibility (prevents warnings when JS uses NativeEventEmitter).
  @ReactMethod
  fun addListener(eventName: String) {
    // Required by RN; no-op because we use DeviceEventEmitter.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required by RN; no-op.
  }

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

  private fun internalVaultBase(): File = File(reactApplicationContext.filesDir, "vault")

  private fun getVaultRootDir(): File {
    val baseDir = vaultRootDirOverride ?: internalVaultBase()

    if (!baseDir.exists()) baseDir.mkdirs()

    vaultRootDirOverride = baseDir

    return baseDir
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

  private fun scrypt(password: String, salt: ByteArray, N: Int, r: Int, p: Int, keyLenBytes: Int): ByteArray {
    return SCrypt.generate(password.toByteArray(Charsets.UTF_8), salt, N, r, p, keyLenBytes)
  }

  private fun deriveKeyFromKdf(password: String, kdfObj: JSONObject, defaultKeyLenBytes: Int = 32): ByteArray {
    val algorithm = kdfObj.getString("algorithm")

    return when (algorithm) {
      "pbkdf2" -> {
        val hash = kdfObj.optString("hash", "SHA-256")
        if (hash != "SHA-256") throw IllegalArgumentException("Unsupported KDF hash")
        val salt = Base64.decode(kdfObj.getString("saltBase64"), Base64.NO_WRAP)
        val iterations = kdfObj.getInt("iterations")
        val keyLenBytes = kdfObj.optInt("keyLen", defaultKeyLenBytes)
        pbkdf2Sha256(password, salt, iterations, keyLenBytes)
      }

      "scrypt" -> {
        val salt = Base64.decode(kdfObj.getString("saltBase64"), Base64.NO_WRAP)
        val N = kdfObj.getInt("N")
        val r = kdfObj.getInt("r")
        val p = kdfObj.getInt("p")
        val keyLenBytes = kdfObj.optInt("keyLen", defaultKeyLenBytes)
        scrypt(password, salt, N, r, p, keyLenBytes)
      }

      else -> throw IllegalArgumentException("Unsupported KDF")
    }
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
  fun ensureInitialized(vaultRootPath: String?, promise: Promise) {
    try {
      val internalBase = internalVaultBase().canonicalFile

      if (!vaultRootPath.isNullOrBlank()) {
        val candidate = File(vaultRootPath).canonicalFile
        vaultRootDirOverride =
          if (candidate.path.startsWith(internalBase.path)) candidate else internalBase
      }

      val root = getVaultRootDir().canonicalFile

      if (!didCleanupTempOnInit) {
        didCleanupTempOnInit = true
        try {
          val tempDir = File(root, "temp")
          if (tempDir.exists()) tempDir.deleteRecursively()
          tempDir.mkdirs()
        } catch (_: Exception) {
          // ignore
        }

        try {
          val foldersDir = File(root, "folders")
          if (!foldersDir.exists()) foldersDir.mkdirs()
        } catch (_: Exception) {
          // ignore
        }
      }

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
        val kdfAlgorithm = kdfObj.getString("algorithm")
        val wrapKey = try {
          deriveKeyFromKdf(password, kdfObj, 32)
        } catch (e: Exception) {
          val result = Arguments.createMap().apply {
            putBoolean("ok", false)
            putString("error", e.message ?: "Unsupported KDF")
          }
          promise.resolve(result)
          return@launch
        }

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

        var migratedWrappedJson: String? = null
        var migratedVerifierJson: String? = null
        var migrated = false

        if (kdfAlgorithm == "scrypt") {
          val newSalt = ByteArray(16)
          SecureRandom().nextBytes(newSalt)
          val newIterations = 120_000
          val newWrapKey = pbkdf2Sha256(password, newSalt, newIterations, 32)

          val newNonce = ByteArray(NONCE_LENGTH_BYTES)
          SecureRandom().nextBytes(newNonce)
          val newWrappedCipher = aesGcmEncrypt(newWrapKey, newNonce, masterKey)

          val newKdfObj = JSONObject().apply {
            put("algorithm", "pbkdf2")
            put("saltBase64", Base64.encodeToString(newSalt, Base64.NO_WRAP))
            put("iterations", newIterations)
            put("hash", "SHA-256")
            put("keyLen", 32)
          }

          val newWrappedObj = JSONObject().apply {
            put("schemaVersion", SCHEMA_VERSION)
            put("keyId", keyId)
            put("wrappedKeyBase64", Base64.encodeToString(newWrappedCipher, Base64.NO_WRAP))
            put("wrapNonceBase64", Base64.encodeToString(newNonce, Base64.NO_WRAP))
            put("kdf", newKdfObj)
          }

          val newVerifierBytes = sha256Base64(newWrapKey + VERIFIER_LABEL.toByteArray())
          val newVerifierObj = JSONObject().apply {
            put("schemaVersion", SCHEMA_VERSION)
            put("method", "password")
            put("kdf", newKdfObj)
            put("verifierBase64", newVerifierBytes)
          }

          migratedWrappedJson = newWrappedObj.toString()
          migratedVerifierJson = newVerifierObj.toString()
          migrated = true
        }

        sessionMasterKey = masterKey
        sessionKeyId = keyId
        expiresAtMs = now + (autoLockSeconds.toLong() * 1000L)

        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
          putBoolean("created", false)
          putString("keyId", keyId)
          if (migrated) {
            putBoolean("migrated", true)
            if (migratedWrappedJson != null) putString("wrappedMasterKeyJson", migratedWrappedJson)
            if (migratedVerifierJson != null) putString("authVerifierJson", migratedVerifierJson)
          }
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

  @ReactMethod
  fun readTempText(sessionId: String, fileName: String, promise: Promise) {
    if (!isUnlocked()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    scope.launch {
      try {
        val safeName = File(fileName).name
        val sessionDir = File(getVaultRootDir(), "temp/session_$sessionId")
        val target = File(sessionDir, safeName)

        if (!target.exists() || !target.isFile) {
          val result = Arguments.createMap().apply {
            putBoolean("ok", false)
            putString("error", "Temp file not found")
          }
          promise.resolve(result)
          return@launch
        }

        val size = target.length()
        if (size > MAX_TEMP_TEXT_BYTES) {
          val result = Arguments.createMap().apply {
            putBoolean("ok", false)
            putString("error", "Temp file too large")
          }
          promise.resolve(result)
          return@launch
        }

        val text = target.readText(Charsets.UTF_8)
        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
          putString("text", text)
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
  fun writeTempText(sessionId: String, fileName: String, text: String, promise: Promise) {
    if (!isUnlocked()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    scope.launch {
      try {
        val safeName = File(fileName).name
        val sessionDir = File(getVaultRootDir(), "temp/session_$sessionId")
        sessionDir.mkdirs()
        val target = File(sessionDir, safeName)

        target.writeText(text, Charsets.UTF_8)

        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
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

  private fun openInputStream(uriStr: String): InputStream {
    val uri = Uri.parse(uriStr)
    val scheme = uri.scheme

    if (scheme == null) {
      return FileInputStream(File(uriStr))
    }

    if (scheme.equals("file", ignoreCase = true)) {
      val p = uri.path ?: throw IllegalArgumentException("Invalid file uri")
      return FileInputStream(File(p))
    }

    return reactApplicationContext.contentResolver.openInputStream(uri)
      ?: throw IllegalArgumentException("Cannot open input stream")
  }

  private fun isZipName(name: String): Boolean {
    return name.lowercase().endsWith(".zip")
  }

  private suspend fun zipSingleFileTo(
    jobId: String,
    fileId: String,
    openInput: () -> InputStream,
    outputZip: File,
    entryName: String,
    totalPlain: Long?
  ) {
    outputZip.parentFile?.mkdirs()

    var readTotal: Long = 0
    var lastEmit: Long = 0

    ZipOutputStream(FileOutputStream(outputZip)).use { zos ->
      val safeEntryName = File(entryName).name
      val entry = ZipEntry(safeEntryName)
      zos.putNextEntry(entry)

      openInput().use { input ->
        val buf = ByteArray(64 * 1024)
        while (true) {
          currentCoroutineContext().ensureActive()
          val read = input.read(buf)
          if (read <= 0) break

          zos.write(buf, 0, read)
          readTotal += read.toLong()

          val now = nowMs()
          if (now - lastEmit >= 200) {
            lastEmit = now
            emitProgress(jobId, fileId, "compress", readTotal, totalPlain)
          }
        }
      }

      zos.closeEntry()
    }

    emitProgress(jobId, fileId, "compress", totalPlain ?: readTotal, totalPlain)
  }

  private suspend fun unzipSingleFileTo(
    jobId: String,
    fileId: String,
    zipFile: File,
    outputDir: File,
    preferredName: String?
  ): File {
    outputDir.mkdirs()

    var writtenTotal: Long = 0
    var lastEmit: Long = 0

    var extracted: File? = null

    ZipInputStream(FileInputStream(zipFile)).use { zis ->
      while (true) {
        currentCoroutineContext().ensureActive()
        val entry = zis.nextEntry ?: break
        if (entry.isDirectory) {
          zis.closeEntry()
          continue
        }

        val chosen = File(preferredName ?: entry.name).name
        val outFile = File(outputDir, chosen)
        FileOutputStream(outFile).use { out ->
          val buf = ByteArray(64 * 1024)
          while (true) {
            currentCoroutineContext().ensureActive()
            val read = zis.read(buf)
            if (read <= 0) break
            out.write(buf, 0, read)
            writtenTotal += read.toLong()

            val now = nowMs()
            if (now - lastEmit >= 200) {
              lastEmit = now
              emitProgress(jobId, fileId, "decompress", writtenTotal, null)
            }
          }
        }

        zis.closeEntry()
        extracted = outFile
        break
      }
    }

    if (extracted == null) throw IllegalArgumentException("ZIP had no file entries")

    emitProgress(jobId, fileId, "decompress", writtenTotal.coerceAtLeast(1), null)
    return extracted
  }

  @ReactMethod
  fun probeUrisReadable(inputUris: ReadableArray, promise: Promise) {
    scope.launch {
      try {
        val readable = Arguments.createArray()

        for (i in 0 until inputUris.size()) {
          val uriStr = inputUris.getString(i)
          if (uriStr.isNullOrBlank()) {
            readable.pushBoolean(false)
            continue
          }

          val ok = try {
            openInputStream(uriStr).use { stream ->
              val buf = ByteArray(1)
              stream.read(buf)
            }
            true
          } catch (_: Exception) {
            false
          }

          readable.pushBoolean(ok)
        }

        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
          putArray("readable", readable)
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

  private fun getDisplayName(uriStr: String): String {
    val uri = Uri.parse(uriStr)
    val scheme = uri.scheme
    if (scheme == null) {
      return File(uriStr).name.ifBlank { "file" }
    }
    if (scheme.equals("file", ignoreCase = true)) {
      return File(uri.path ?: "").name.ifBlank { "file" }
    }

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
    val scheme = uri.scheme
    if (scheme == null) {
      return try {
        File(uriStr).length().takeIf { it >= 0 }
      } catch (_: Exception) {
        null
      }
    }
    if (scheme.equals("file", ignoreCase = true)) {
      return try {
        File(uri.path ?: "").length().takeIf { it >= 0 }
      } catch (_: Exception) {
        null
      }
    }

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

  private data class DirEntry(
    val uri: Uri,
    val relativePath: String,
    val displayName: String,
    val size: Long?
  )

  private fun listDirectoryFiles(treeUriStr: String): List<DirEntry> {
    val treeUri = Uri.parse(treeUriStr)
    val rootDoc = DocumentFile.fromTreeUri(reactApplicationContext, treeUri)
      ?: throw IllegalArgumentException("Cannot access directory")

    val rootName = rootDoc.name ?: "folder"
    val out = mutableListOf<DirEntry>()

    fun walk(current: DocumentFile, relBase: String) {
      val children = current.listFiles()
      for (child in children) {
        val name = child.name ?: continue
        val nextRel = if (relBase.isBlank()) name else "$relBase/$name"

        if (child.isDirectory) {
          walk(child, nextRel)
        } else if (child.isFile) {
          val uri = child.uri
          val size = try {
            child.length().takeIf { it >= 0 }
          } catch (_: Exception) {
            null
          }

          out.add(
            DirEntry(
              uri = uri,
              relativePath = "$rootName/$nextRel",
              displayName = name,
              size = size
            )
          )
        }
      }
    }

    walk(rootDoc, "")
    return out
  }

  @ReactMethod
  fun encryptUris(jobId: String, folderId: String, inputUris: ReadableArray, autoCompressLargeFiles: Boolean, compressionThresholdBytes: Double, promise: Promise) {
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

        val tempJobDir = File(File(root, "temp"), "job_$jobId")
        tempJobDir.mkdirs()

        val results = Arguments.createArray()

        for (i in 0 until inputUris.size()) {
          ensureActive()

          val uriStr = inputUris.getString(i) ?: continue
          val fileId = UUID.randomUUID().toString()

          val name = getDisplayName(uriStr)
          val totalPlain = getSize(uriStr)

          val safeName = File(name).name
          val threshold = compressionThresholdBytes.toLong()
          val shouldCompress = autoCompressLargeFiles && threshold > 0 && totalPlain != null && totalPlain >= threshold && !isZipName(safeName)

          var compressionAlgorithm: String? = null
          var zipEntryName: String? = null
          var zipFile: File? = null

          if (shouldCompress) {
            zipFile = File(tempJobDir, "$fileId.zip")
            zipSingleFileTo(
              jobId = jobId,
              fileId = fileId,
              openInput = { openInputStream(uriStr) },
              outputZip = zipFile,
              entryName = safeName,
              totalPlain = totalPlain
            )
            compressionAlgorithm = "zip"
            zipEntryName = safeName
          }

          val nonce = ByteArray(NONCE_LENGTH_BYTES)
          SecureRandom().nextBytes(nonce)

          val cipher = Cipher.getInstance("AES/GCM/NoPadding")
          cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(masterKey, "AES"), GCMParameterSpec(TAG_LENGTH_BITS, nonce))

          val digest = MessageDigest.getInstance("SHA-256")

          val outFile = File(itemsDir, "$fileId.enc")
          var writtenCipher: Long = 0
          var lastEmit: Long = 0

          val inputProvider = if (zipFile != null) {
            { FileInputStream(zipFile) as InputStream }
          } else {
            { openInputStream(uriStr) }
          }

          inputProvider().use { input ->
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
              val cipherPartLen = (finalBytes.size - TAG_LENGTH_BYTES).coerceAtLeast(0)
              val cipherPart = finalBytes.copyOfRange(0, cipherPartLen)
              val tagPart = finalBytes.copyOfRange(cipherPartLen, finalBytes.size)

              if (cipherPart.isNotEmpty()) {
                output.write(cipherPart)
                digest.update(cipherPart)
                writtenCipher += cipherPart.size
              }
              if (tagPart.isNotEmpty()) {
                output.write(tagPart)
                writtenCipher += tagPart.size
              }
            }
          }

          if (zipFile != null) {
            try {
              zipFile.delete()
            } catch (_: Exception) {
              // ignore
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
            if (compressionAlgorithm != null) putString("compressionAlgorithm", compressionAlgorithm)
            if (zipEntryName != null) putString("zipEntryName", zipEntryName)
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
        try {
          File(getVaultRootDir(), "temp/job_$jobId").deleteRecursively()
        } catch (_: Exception) {
          // ignore
        }
        jobs.remove(jobId)
      }
    }

    jobs[jobId] = job
  }

  @ReactMethod
  fun encryptDirectoryUri(jobId: String, folderId: String, directoryUri: String, autoCompressLargeFiles: Boolean, compressionThresholdBytes: Double, promise: Promise) {
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

        val tempJobDir = File(File(root, "temp"), "job_$jobId")
        tempJobDir.mkdirs()

        emitProgress(jobId, null, "scan", 0, null)

        val entries = listDirectoryFiles(directoryUri)

        val results = Arguments.createArray()

        for (entry in entries) {
          ensureActive()

          val fileId = UUID.randomUUID().toString()
          val totalPlain = entry.size

          val safeName = File(entry.displayName).name
          val threshold = compressionThresholdBytes.toLong()
          val shouldCompress = autoCompressLargeFiles && threshold > 0 && totalPlain != null && totalPlain >= threshold && !isZipName(safeName)

          var compressionAlgorithm: String? = null
          var zipEntryName: String? = null
          var zipFile: File? = null

          if (shouldCompress) {
            zipFile = File(tempJobDir, "$fileId.zip")
            zipSingleFileTo(
              jobId = jobId,
              fileId = fileId,
              openInput = {
                reactApplicationContext.contentResolver.openInputStream(entry.uri)
                  ?: throw IllegalArgumentException("Cannot open input stream")
              },
              outputZip = zipFile,
              entryName = safeName,
              totalPlain = totalPlain
            )
            compressionAlgorithm = "zip"
            zipEntryName = safeName
          }

          val nonce = ByteArray(NONCE_LENGTH_BYTES)
          SecureRandom().nextBytes(nonce)

          val cipher = Cipher.getInstance("AES/GCM/NoPadding")
          cipher.init(
            Cipher.ENCRYPT_MODE,
            SecretKeySpec(masterKey, "AES"),
            GCMParameterSpec(TAG_LENGTH_BITS, nonce)
          )

          val digest = MessageDigest.getInstance("SHA-256")

          val outFile = File(itemsDir, "$fileId.enc")
          var writtenCipher: Long = 0
          var lastEmit: Long = 0

          val inputProvider = if (zipFile != null) {
            { FileInputStream(zipFile) as InputStream }
          } else {
            {
              reactApplicationContext.contentResolver.openInputStream(entry.uri)
                ?: throw IllegalArgumentException("Cannot open input stream")
            }
          }

          inputProvider().use { input ->
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
              val cipherPartLen = (finalBytes.size - TAG_LENGTH_BYTES).coerceAtLeast(0)
              val cipherPart = finalBytes.copyOfRange(0, cipherPartLen)
              val tagPart = finalBytes.copyOfRange(cipherPartLen, finalBytes.size)

              if (cipherPart.isNotEmpty()) {
                output.write(cipherPart)
                digest.update(cipherPart)
                writtenCipher += cipherPart.size
              }
              if (tagPart.isNotEmpty()) {
                output.write(tagPart)
                writtenCipher += tagPart.size
              }
            }
          }

          if (zipFile != null) {
            try {
              zipFile.delete()
            } catch (_: Exception) {
              // ignore
            }
          }

          emitProgress(jobId, fileId, "encrypt", writtenCipher, totalPlain)

          val hashHex = bytesToHex(digest.digest())

          val resultItem = Arguments.createMap().apply {
            putString("fileId", fileId)
            putString("keyId", keyId)
            putString("originalName", entry.displayName)
            putString("originalRelativePath", entry.relativePath)
            putString("nonceBase64", Base64.encodeToString(nonce, Base64.NO_WRAP))
            putString("hashCipherHex", hashHex)
            putString("cipherPath", outFile.absolutePath)
            putDouble("sizePlainBytes", (totalPlain ?: -1L).toDouble())
            putDouble("sizeCipherBytes", writtenCipher.toDouble())
            if (compressionAlgorithm != null) putString("compressionAlgorithm", compressionAlgorithm)
            if (zipEntryName != null) putString("zipEntryName", zipEntryName)
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
        try {
          File(getVaultRootDir(), "temp/job_$jobId").deleteRecursively()
        } catch (_: Exception) {
          // ignore
        }
        jobs.remove(jobId)
      }
    }

    jobs[jobId] = job
  }

  @ReactMethod
  fun scanUris(inputUris: ReadableArray, promise: Promise) {
    try {
      val entries = Arguments.createArray()
      for (i in 0 until inputUris.size()) {
        val uriStr = inputUris.getString(i) ?: continue
        val name = getDisplayName(uriStr)
        val size = getSize(uriStr)
        val m = Arguments.createMap().apply {
          putString("uri", uriStr)
          putString("displayName", name)
          if (size != null) putDouble("sizeBytes", size.toDouble())
          else putNull("sizeBytes")
        }
        entries.pushMap(m)
      }

      val result = Arguments.createMap().apply {
        putBoolean("ok", true)
        putArray("entries", entries)
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
  fun scanDirectoryUri(directoryUri: String, promise: Promise) {
    try {
      val entries = listDirectoryFiles(directoryUri)
      val out = Arguments.createArray()
      for (entry in entries) {
        val m = Arguments.createMap().apply {
          putString("uri", entry.uri.toString())
          putString("relativePath", entry.relativePath)
          putString("displayName", entry.displayName)
          if (entry.size != null) putDouble("sizeBytes", entry.size.toDouble())
          else putNull("sizeBytes")
        }
        out.pushMap(m)
      }

      val result = Arguments.createMap().apply {
        putBoolean("ok", true)
        putArray("entries", out)
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
  fun generateFolderKey(promise: Promise) {
    if (!isUnlocked()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val masterKey = sessionMasterKey
    if (masterKey == null) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    try {
      val folderKey = ByteArray(32)
      SecureRandom().nextBytes(folderKey)

      val nonce = ByteArray(NONCE_LENGTH_BYTES)
      SecureRandom().nextBytes(nonce)

      val wrapped = aesGcmEncrypt(masterKey, nonce, folderKey)

      val result = Arguments.createMap().apply {
        putBoolean("ok", true)
        putString("keyId", UUID.randomUUID().toString())
        putString("wrappedKeyBase64", Base64.encodeToString(wrapped, Base64.NO_WRAP))
        putString("wrapNonceBase64", Base64.encodeToString(nonce, Base64.NO_WRAP))
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

  private fun parseBooleanOverrides(json: String?): Map<String, Boolean> {
    if (json.isNullOrBlank()) return emptyMap()
    val obj = JSONObject(json)
    val out = HashMap<String, Boolean>()
    val keys = obj.keys()
    while (keys.hasNext()) {
      val k = keys.next()
      try {
        out[k] = obj.getBoolean(k)
      } catch (_: Exception) {
        // ignore
      }
    }
    return out
  }

  @ReactMethod
  fun encryptUrisPlanned(
    jobId: String,
    folderId: String,
    inputUris: ReadableArray,
    autoCompressLargeFiles: Boolean,
    compressionThresholdBytes: Double,
    compressOverridesJson: String?,
    folderWrappedKeyBase64: String?,
    folderWrappedNonceBase64: String?,
    folderKeyId: String?,
    promise: Promise
  ) {
    if (!isUnlocked()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val masterKey = sessionMasterKey
    val sessionKeyId = sessionKeyId
    if (masterKey == null || sessionKeyId.isNullOrBlank()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val overrides = parseBooleanOverrides(compressOverridesJson)

    val effectiveKey: ByteArray
    val effectiveKeyId: String

    if (!folderWrappedKeyBase64.isNullOrBlank() && !folderWrappedNonceBase64.isNullOrBlank() && !folderKeyId.isNullOrBlank()) {
      val wrapNonce = Base64.decode(folderWrappedNonceBase64, Base64.NO_WRAP)
      val wrappedKey = Base64.decode(folderWrappedKeyBase64, Base64.NO_WRAP)
      effectiveKey = aesGcmDecrypt(masterKey, wrapNonce, wrappedKey)
      effectiveKeyId = folderKeyId
    } else {
      effectiveKey = masterKey
      effectiveKeyId = sessionKeyId
    }

    val job = scope.launch {
      try {
        val root = getVaultRootDir()
        val itemsDir = File(File(File(root, "folders"), folderId), "items")
        if (!itemsDir.exists()) itemsDir.mkdirs()

        val tempJobDir = File(File(root, "temp"), "job_$jobId")
        tempJobDir.mkdirs()

        val results = Arguments.createArray()

        for (i in 0 until inputUris.size()) {
          ensureActive()

          val uriStr = inputUris.getString(i) ?: continue
          val fileId = UUID.randomUUID().toString()

          val name = getDisplayName(uriStr)
          val totalPlain = getSize(uriStr)

          val safeName = File(name).name
          val threshold = compressionThresholdBytes.toLong()

          val autoShould = autoCompressLargeFiles && threshold > 0 && totalPlain != null && totalPlain >= threshold && !isZipName(safeName)
          val override = overrides[uriStr]
          val shouldCompress = override ?: autoShould

          var compressionAlgorithm: String? = null
          var zipEntryName: String? = null
          var zipFile: File? = null

          if (shouldCompress) {
            zipFile = File(tempJobDir, "$fileId.zip")
            zipSingleFileTo(
              jobId = jobId,
              fileId = fileId,
              openInput = { openInputStream(uriStr) },
              outputZip = zipFile,
              entryName = safeName,
              totalPlain = totalPlain
            )
            compressionAlgorithm = "zip"
            zipEntryName = safeName
          }

          val nonce = ByteArray(NONCE_LENGTH_BYTES)
          SecureRandom().nextBytes(nonce)

          val cipher = Cipher.getInstance("AES/GCM/NoPadding")
          cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(effectiveKey, "AES"), GCMParameterSpec(TAG_LENGTH_BITS, nonce))

          val digest = MessageDigest.getInstance("SHA-256")

          val outFile = File(itemsDir, "$fileId.enc")
          var writtenCipher: Long = 0
          var lastEmit: Long = 0

          val inputProvider = if (zipFile != null) {
            { FileInputStream(zipFile) as InputStream }
          } else {
            { openInputStream(uriStr) }
          }

          inputProvider().use { input ->
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
              val cipherPartLen = (finalBytes.size - TAG_LENGTH_BYTES).coerceAtLeast(0)
              val cipherPart = finalBytes.copyOfRange(0, cipherPartLen)
              val tagPart = finalBytes.copyOfRange(cipherPartLen, finalBytes.size)

              if (cipherPart.isNotEmpty()) {
                output.write(cipherPart)
                digest.update(cipherPart)
                writtenCipher += cipherPart.size
              }
              if (tagPart.isNotEmpty()) {
                output.write(tagPart)
                writtenCipher += tagPart.size
              }
            }
          }

          if (zipFile != null) {
            try {
              zipFile.delete()
            } catch (_: Exception) {
              // ignore
            }
          }

          emitProgress(jobId, fileId, "encrypt", writtenCipher, totalPlain)

          val hashHex = bytesToHex(digest.digest())

          val resultItem = Arguments.createMap().apply {
            putString("fileId", fileId)
            putString("keyId", effectiveKeyId)
            putString("originalName", name)
            putString("nonceBase64", Base64.encodeToString(nonce, Base64.NO_WRAP))
            putString("hashCipherHex", hashHex)
            putString("cipherPath", outFile.absolutePath)
            putDouble("sizePlainBytes", (totalPlain ?: -1L).toDouble())
            putDouble("sizeCipherBytes", writtenCipher.toDouble())
            if (compressionAlgorithm != null) putString("compressionAlgorithm", compressionAlgorithm)
            if (zipEntryName != null) putString("zipEntryName", zipEntryName)
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
        try {
          File(getVaultRootDir(), "temp/job_$jobId").deleteRecursively()
        } catch (_: Exception) {
          // ignore
        }
        jobs.remove(jobId)
      }
    }

    jobs[jobId] = job
  }

  @ReactMethod
  fun encryptDirectoryUriPlanned(
    jobId: String,
    folderId: String,
    directoryUri: String,
    autoCompressLargeFiles: Boolean,
    compressionThresholdBytes: Double,
    compressOverridesJson: String?,
    folderWrappedKeyBase64: String?,
    folderWrappedNonceBase64: String?,
    folderKeyId: String?,
    promise: Promise
  ) {
    if (!isUnlocked()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val masterKey = sessionMasterKey
    val sessionKeyId = sessionKeyId
    if (masterKey == null || sessionKeyId.isNullOrBlank()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val overrides = parseBooleanOverrides(compressOverridesJson)

    val effectiveKey: ByteArray
    val effectiveKeyId: String

    if (!folderWrappedKeyBase64.isNullOrBlank() && !folderWrappedNonceBase64.isNullOrBlank() && !folderKeyId.isNullOrBlank()) {
      val wrapNonce = Base64.decode(folderWrappedNonceBase64, Base64.NO_WRAP)
      val wrappedKey = Base64.decode(folderWrappedKeyBase64, Base64.NO_WRAP)
      effectiveKey = aesGcmDecrypt(masterKey, wrapNonce, wrappedKey)
      effectiveKeyId = folderKeyId
    } else {
      effectiveKey = masterKey
      effectiveKeyId = sessionKeyId
    }

    val job = scope.launch {
      try {
        val root = getVaultRootDir()
        val itemsDir = File(File(File(root, "folders"), folderId), "items")
        if (!itemsDir.exists()) itemsDir.mkdirs()

        val tempJobDir = File(File(root, "temp"), "job_$jobId")
        tempJobDir.mkdirs()

        emitProgress(jobId, null, "scan", 0, null)
        val entries = listDirectoryFiles(directoryUri)

        val results = Arguments.createArray()

        for (entry in entries) {
          ensureActive()

          val fileId = UUID.randomUUID().toString()
          val totalPlain = entry.size

          val safeName = File(entry.displayName).name
          val threshold = compressionThresholdBytes.toLong()

          val autoShould = autoCompressLargeFiles && threshold > 0 && totalPlain != null && totalPlain >= threshold && !isZipName(safeName)
          val override = overrides[entry.uri.toString()]
          val shouldCompress = override ?: autoShould

          var compressionAlgorithm: String? = null
          var zipEntryName: String? = null
          var zipFile: File? = null

          if (shouldCompress) {
            zipFile = File(tempJobDir, "$fileId.zip")
            zipSingleFileTo(
              jobId = jobId,
              fileId = fileId,
              openInput = {
                reactApplicationContext.contentResolver.openInputStream(entry.uri)
                  ?: throw IllegalArgumentException("Cannot open input stream")
              },
              outputZip = zipFile,
              entryName = safeName,
              totalPlain = totalPlain
            )
            compressionAlgorithm = "zip"
            zipEntryName = safeName
          }

          val nonce = ByteArray(NONCE_LENGTH_BYTES)
          SecureRandom().nextBytes(nonce)

          val cipher = Cipher.getInstance("AES/GCM/NoPadding")
          cipher.init(
            Cipher.ENCRYPT_MODE,
            SecretKeySpec(effectiveKey, "AES"),
            GCMParameterSpec(TAG_LENGTH_BITS, nonce)
          )

          val digest = MessageDigest.getInstance("SHA-256")

          val outFile = File(itemsDir, "$fileId.enc")
          var writtenCipher: Long = 0
          var lastEmit: Long = 0

          val inputProvider = if (zipFile != null) {
            { FileInputStream(zipFile) as InputStream }
          } else {
            {
              reactApplicationContext.contentResolver.openInputStream(entry.uri)
                ?: throw IllegalArgumentException("Cannot open input stream")
            }
          }

          inputProvider().use { input ->
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
              val cipherPartLen = (finalBytes.size - TAG_LENGTH_BYTES).coerceAtLeast(0)
              val cipherPart = finalBytes.copyOfRange(0, cipherPartLen)
              val tagPart = finalBytes.copyOfRange(cipherPartLen, finalBytes.size)

              if (cipherPart.isNotEmpty()) {
                output.write(cipherPart)
                digest.update(cipherPart)
                writtenCipher += cipherPart.size
              }
              if (tagPart.isNotEmpty()) {
                output.write(tagPart)
                writtenCipher += tagPart.size
              }
            }
          }

          if (zipFile != null) {
            try {
              zipFile.delete()
            } catch (_: Exception) {
              // ignore
            }
          }

          emitProgress(jobId, fileId, "encrypt", writtenCipher, totalPlain)

          val hashHex = bytesToHex(digest.digest())

          val resultItem = Arguments.createMap().apply {
            putString("fileId", fileId)
            putString("keyId", effectiveKeyId)
            putString("originalName", entry.displayName)
            putString("originalRelativePath", entry.relativePath)
            putString("nonceBase64", Base64.encodeToString(nonce, Base64.NO_WRAP))
            putString("hashCipherHex", hashHex)
            putString("cipherPath", outFile.absolutePath)
            putDouble("sizePlainBytes", (totalPlain ?: -1L).toDouble())
            putDouble("sizeCipherBytes", writtenCipher.toDouble())
            if (compressionAlgorithm != null) putString("compressionAlgorithm", compressionAlgorithm)
            if (zipEntryName != null) putString("zipEntryName", zipEntryName)
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
        try {
          File(getVaultRootDir(), "temp/job_$jobId").deleteRecursively()
        } catch (_: Exception) {
          // ignore
        }
        jobs.remove(jobId)
      }
    }

    jobs[jobId] = job
  }

  @ReactMethod
  fun encryptUriToExistingItemPlanned(
    jobId: String,
    folderId: String,
    itemId: String,
    inputUri: String,
    outputName: String,
    autoCompressLargeFiles: Boolean,
    compressionThresholdBytes: Double,
    compressionAlgorithm: String?,
    zipEntryName: String?,
    folderWrappedKeyBase64: String?,
    folderWrappedNonceBase64: String?,
    folderKeyId: String?,
    promise: Promise
  ) {
    if (!isUnlocked()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val masterKey = sessionMasterKey
    val sessionKeyId = sessionKeyId
    if (masterKey == null || sessionKeyId.isNullOrBlank()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val effectiveKey: ByteArray
    val effectiveKeyId: String

    if (!folderWrappedKeyBase64.isNullOrBlank() && !folderWrappedNonceBase64.isNullOrBlank() && !folderKeyId.isNullOrBlank()) {
      val wrapNonce = Base64.decode(folderWrappedNonceBase64, Base64.NO_WRAP)
      val wrappedKey = Base64.decode(folderWrappedKeyBase64, Base64.NO_WRAP)
      effectiveKey = aesGcmDecrypt(masterKey, wrapNonce, wrappedKey)
      effectiveKeyId = folderKeyId
    } else {
      effectiveKey = masterKey
      effectiveKeyId = sessionKeyId
    }

    val job = scope.launch {
      try {
        val root = getVaultRootDir()
        val itemsDir = File(File(File(root, "folders"), folderId), "items")
        if (!itemsDir.exists()) itemsDir.mkdirs()

        val tempJobDir = File(File(root, "temp"), "job_$jobId")
        tempJobDir.mkdirs()

        val totalPlain = getSize(inputUri)

        val safeName = File(outputName).name
        val threshold = compressionThresholdBytes.toLong()

        val shouldCompress = if (!compressionAlgorithm.isNullOrBlank()) {
          compressionAlgorithm == "zip"
        } else {
          val autoShould = autoCompressLargeFiles && threshold > 0 && totalPlain != null && totalPlain >= threshold && !isZipName(safeName)
          autoShould
        }

        var usedCompressionAlgorithm: String? = null
        var usedZipEntryName: String? = null
        var zipFile: File? = null

        if (shouldCompress) {
          val entryName = (zipEntryName?.takeIf { it.isNotBlank() } ?: safeName)
          zipFile = File(tempJobDir, "$itemId.zip")
          zipSingleFileTo(
            jobId = jobId,
            fileId = itemId,
            openInput = { openInputStream(inputUri) },
            outputZip = zipFile,
            entryName = entryName,
            totalPlain = totalPlain
          )
          usedCompressionAlgorithm = "zip"
          usedZipEntryName = entryName
        }

        val nonce = ByteArray(NONCE_LENGTH_BYTES)
        SecureRandom().nextBytes(nonce)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(effectiveKey, "AES"), GCMParameterSpec(TAG_LENGTH_BITS, nonce))

        val digest = MessageDigest.getInstance("SHA-256")

        val outFile = File(itemsDir, "$itemId.enc")
        val tmpFile = File(itemsDir, "$itemId.enc.tmp")
        var writtenCipher: Long = 0
        var lastEmit: Long = 0

        val inputProvider = if (zipFile != null) {
          { FileInputStream(zipFile) as InputStream }
        } else {
          { openInputStream(inputUri) }
        }

        inputProvider().use { input ->
          FileOutputStream(tmpFile).use { output ->
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
                emitProgress(jobId, itemId, "encrypt", writtenCipher, totalPlain)
              }
            }

            val finalBytes = cipher.doFinal()
            val cipherPartLen = (finalBytes.size - TAG_LENGTH_BYTES).coerceAtLeast(0)
            val cipherPart = finalBytes.copyOfRange(0, cipherPartLen)
            val tagPart = finalBytes.copyOfRange(cipherPartLen, finalBytes.size)

            if (cipherPart.isNotEmpty()) {
              output.write(cipherPart)
              digest.update(cipherPart)
              writtenCipher += cipherPart.size
            }
            if (tagPart.isNotEmpty()) {
              output.write(tagPart)
              writtenCipher += tagPart.size
            }
          }
        }

        if (zipFile != null) {
          try {
            zipFile.delete()
          } catch (_: Exception) {
            // ignore
          }
        }

        emitProgress(jobId, itemId, "encrypt", writtenCipher, totalPlain)

        try {
          if (outFile.exists()) outFile.delete()
        } catch (_: Exception) {
          // ignore
        }
        if (!tmpFile.renameTo(outFile)) {
          throw IllegalStateException("Failed to replace ciphertext file")
        }

        val hashHex = bytesToHex(digest.digest())

        val results = Arguments.createArray()
        val resultItem = Arguments.createMap().apply {
          putString("fileId", itemId)
          putString("keyId", effectiveKeyId)
          putString("originalName", outputName)
          putString("nonceBase64", Base64.encodeToString(nonce, Base64.NO_WRAP))
          putString("hashCipherHex", hashHex)
          putString("cipherPath", outFile.absolutePath)
          putDouble("sizePlainBytes", (totalPlain ?: -1L).toDouble())
          putDouble("sizeCipherBytes", writtenCipher.toDouble())
          if (usedCompressionAlgorithm != null) putString("compressionAlgorithm", usedCompressionAlgorithm)
          if (usedZipEntryName != null) putString("zipEntryName", usedZipEntryName)
        }
        results.pushMap(resultItem)

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
        try {
          File(getVaultRootDir(), "temp/job_$jobId").deleteRecursively()
        } catch (_: Exception) {
          // ignore
        }
        jobs.remove(jobId)
      }
    }

    jobs[jobId] = job
  }

  @ReactMethod
  fun decryptToTempWithFolderKey(
    jobId: String,
    folderId: String,
    itemId: String,
    nonceBase64: String,
    outputName: String,
    sessionId: String,
    expectedHashCipherHex: String?,
    compressionAlgorithm: String?,
    zipEntryName: String?,
    folderWrappedKeyBase64: String?,
    folderWrappedNonceBase64: String?,
    folderKeyId: String?,
    promise: Promise
  ) {
    if (!isUnlocked()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val masterKey = sessionMasterKey
    val sessionKeyId = sessionKeyId
    if (masterKey == null || sessionKeyId.isNullOrBlank()) {
      val result = Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("error", "Vault is locked")
      }
      promise.resolve(result)
      return
    }

    val effectiveKey: ByteArray
    if (!folderWrappedKeyBase64.isNullOrBlank() && !folderWrappedNonceBase64.isNullOrBlank() && !folderKeyId.isNullOrBlank()) {
      val wrapNonce = Base64.decode(folderWrappedNonceBase64, Base64.NO_WRAP)
      val wrappedKey = Base64.decode(folderWrappedKeyBase64, Base64.NO_WRAP)
      effectiveKey = aesGcmDecrypt(masterKey, wrapNonce, wrappedKey)
    } else {
      effectiveKey = masterKey
    }

    val job = scope.launch {
      try {
        val root = getVaultRootDir()
        val encFile = File(File(File(File(root, "folders"), folderId), "items"), "$itemId.enc")
        if (!encFile.exists()) throw IllegalArgumentException("Cipher file not found")

        val sessionDir = File(File(root, "temp"), "session_$sessionId")
        sessionDir.mkdirs()

        val safeName = File(outputName).name
        val target = File(sessionDir, safeName)

        val nonce = Base64.decode(nonceBase64, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
          Cipher.DECRYPT_MODE,
          SecretKeySpec(effectiveKey, "AES"),
          GCMParameterSpec(TAG_LENGTH_BITS, nonce)
        )

        val total = encFile.length()
        if (total <= TAG_LENGTH_BYTES.toLong()) throw IllegalArgumentException("Invalid ciphertext")
        val totalCipher = total - TAG_LENGTH_BYTES

        val digest = MessageDigest.getInstance("SHA-256")

        var readBytes: Long = 0
        var lastEmit: Long = 0

        FileInputStream(encFile).use { input ->
          FileOutputStream(target).use { output ->
            val buf = ByteArray(64 * 1024)

            var hold = ByteArray(TAG_LENGTH_BYTES)
            var holdLen = 0

            while (true) {
              ensureActive()
              val read = input.read(buf)
              if (read <= 0) break

              val chunk = buf.copyOfRange(0, read)

              if (readBytes + chunk.size <= totalCipher) {
                digest.update(chunk)
                val out = cipher.update(chunk)
                if (out != null && out.isNotEmpty()) output.write(out)
                readBytes += chunk.size
              } else {
                val cipherPart = (totalCipher - readBytes).toInt().coerceAtLeast(0)
                if (cipherPart > 0) {
                  val part = chunk.copyOfRange(0, cipherPart)
                  digest.update(part)
                  val out = cipher.update(part)
                  if (out != null && out.isNotEmpty()) output.write(out)
                  readBytes += cipherPart
                }
                val rest = chunk.copyOfRange(cipherPart, chunk.size)
                
                val needed = TAG_LENGTH_BYTES - holdLen
                val take = needed.coerceAtMost(rest.size)
                System.arraycopy(rest, 0, hold, holdLen, take)
                holdLen += take
              }

              val now = nowMs()
              if (now - lastEmit >= 200) {
                lastEmit = now
                emitProgress(jobId, itemId, "decrypt", readBytes.coerceAtMost(totalCipher), totalCipher)
              }
            }

            if (holdLen != TAG_LENGTH_BYTES) throw IllegalArgumentException("Invalid ciphertext")
            val finalBytes = cipher.doFinal(hold)
            if (finalBytes.isNotEmpty()) output.write(finalBytes)
          }
        }

        val hashHex = bytesToHex(digest.digest())
        if (!expectedHashCipherHex.isNullOrBlank()) {
          if (hashHex.lowercase() != expectedHashCipherHex.lowercase()) {
            throw IllegalStateException("Ciphertext integrity check failed")
          }
        }

        emitProgress(jobId, itemId, "decrypt", totalCipher, totalCipher)

        val finalFile = if (!compressionAlgorithm.isNullOrBlank() && compressionAlgorithm == "zip") {
          val extracted = unzipSingleFileTo(jobId, itemId, target, sessionDir, safeName)
          try { target.delete() } catch (_: Exception) {}
          extracted
        } else {
          target
        }

        val finalUri = Uri.fromFile(finalFile).toString()

        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
          putString("tempPath", finalUri)
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
  fun decryptToTemp(jobId: String, folderId: String, itemId: String, nonceBase64: String, outputName: String, sessionId: String, expectedHashCipherHex: String?, compressionAlgorithm: String?, zipEntryName: String?, promise: Promise) {
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

        val safeOutName = File(outputName).name
        val isCompressed = compressionAlgorithm == "zip"
        val outZip = if (isCompressed) File(tempDir, "$itemId.zip") else null
        val outFile = if (isCompressed) File(tempDir, safeOutName) else File(tempDir, safeOutName)

        val nonce = Base64.decode(nonceBase64, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
          Cipher.DECRYPT_MODE,
          SecretKeySpec(masterKey, "AES"),
          GCMParameterSpec(TAG_LENGTH_BITS, nonce)
        )

        val total = encFile.length()
        if (total <= TAG_LENGTH_BYTES.toLong()) throw IllegalArgumentException("Invalid ciphertext")
        val totalCipher = total - TAG_LENGTH_BYTES

        val digest = MessageDigest.getInstance("SHA-256")

        var readBytes: Long = 0
        var lastEmit: Long = 0

        val hold = ByteArray(TAG_LENGTH_BYTES)
        var holdLen = 0

        encFile.inputStream().use { input ->
          FileOutputStream(outZip ?: outFile).use { output ->
            val buf = ByteArray(64 * 1024)

            while (true) {
              ensureActive()
              val read = input.read(buf)
              if (read <= 0) break

              readBytes += read.toLong()
              val combinedLen = holdLen + read
              if (combinedLen <= TAG_LENGTH_BYTES) {
                System.arraycopy(buf, 0, hold, holdLen, read)
                holdLen = combinedLen
              } else {
                val combined = ByteArray(combinedLen)
                if (holdLen > 0) System.arraycopy(hold, 0, combined, 0, holdLen)
                System.arraycopy(buf, 0, combined, holdLen, read)

                val processLen = combinedLen - TAG_LENGTH_BYTES
                val toProcess = combined.copyOfRange(0, processLen)

                if (toProcess.isNotEmpty()) digest.update(toProcess)

                val newHold = combined.copyOfRange(processLen, combinedLen)
                System.arraycopy(newHold, 0, hold, 0, TAG_LENGTH_BYTES)
                holdLen = TAG_LENGTH_BYTES

                val out = cipher.update(toProcess)
                if (out != null && out.isNotEmpty()) output.write(out)
              }

              val now = nowMs()
              if (now - lastEmit >= 200) {
                lastEmit = now
                emitProgress(jobId, itemId, "decrypt", readBytes.coerceAtMost(totalCipher), totalCipher)
              }
            }

            if (holdLen != TAG_LENGTH_BYTES) throw IllegalArgumentException("Invalid ciphertext")

            val finalBytes = cipher.doFinal(hold)
            if (finalBytes.isNotEmpty()) output.write(finalBytes)
          }
        }

        val hashHex = bytesToHex(digest.digest())
        if (!expectedHashCipherHex.isNullOrBlank()) {
          if (hashHex.lowercase() != expectedHashCipherHex.lowercase()) {
            throw IllegalStateException("Ciphertext integrity check failed")
          }
        }

        emitProgress(jobId, itemId, "decrypt", totalCipher, totalCipher)

        var finalFile = outFile

        if (isCompressed && outZip != null) {
          val extracted = unzipSingleFileTo(
            jobId = jobId,
            fileId = itemId,
            zipFile = outZip,
            outputDir = tempDir,
            preferredName = safeOutName
          )
          try {
            outZip.delete()
          } catch (_: Exception) {}
          finalFile = extracted
        }

        val finalUri = Uri.fromFile(finalFile).toString()

        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
          putString("tempPath", finalUri)
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
  fun copyFileToDirectoryUri(sourcePath: String, directoryUri: String, destFileName: String, mimeType: String, promise: Promise) {
    try {
      val dirDoc = DocumentFile.fromTreeUri(reactApplicationContext, Uri.parse(directoryUri))
        ?: throw IllegalArgumentException("Invalid directoryUri")
      if (!dirDoc.canWrite()) throw IllegalStateException("Directory is not writable")

      val destDoc = dirDoc.createFile(mimeType, destFileName)
        ?: throw IllegalStateException("Failed to create destination file")

      val destUri = destDoc.uri

      FileInputStream(File(sourcePath)).use { input ->
        reactApplicationContext.contentResolver.openOutputStream(destUri, "w")
          ?.use { output ->
            val buf = ByteArray(64 * 1024)
            while (true) {
              val read = input.read(buf)
              if (read <= 0) break
              output.write(buf, 0, read)
            }
            output.flush()
          } ?: throw IllegalStateException("Failed to open destination output stream")
      }

      val result = Arguments.createMap().apply {
        putBoolean("ok", true)
        putString("uri", destUri.toString())
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
  fun encryptFileToDirectoryUri(jobId: String, inputPath: String, directoryUri: String, destFileName: String, password: String, promise: Promise) {
    val job = scope.launch {
      try {
        val dirDoc = DocumentFile.fromTreeUri(reactApplicationContext, Uri.parse(directoryUri))
          ?: throw IllegalArgumentException("Invalid directoryUri")
        if (!dirDoc.canWrite()) throw IllegalStateException("Directory is not writable")

        val destDoc = dirDoc.createFile("application/octet-stream", destFileName)
          ?: throw IllegalStateException("Failed to create destination file")

        val destUri = destDoc.uri

        val inputFile = File(inputPath)
        if (!inputFile.exists()) throw IllegalArgumentException("Input file not found")

        val salt = ByteArray(16)
        SecureRandom().nextBytes(salt)

        val iterations = 120_000
        val key = pbkdf2Sha256(password, salt, iterations, 32)

        val nonce = ByteArray(NONCE_LENGTH_BYTES)
        SecureRandom().nextBytes(nonce)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG_LENGTH_BITS, nonce))

        val total = inputFile.length()
        var processed: Long = 0
        var lastEmit: Long = 0

        val magic = byteArrayOf('U'.code.toByte(), 'V'.code.toByte(), 'B'.code.toByte(), 'K'.code.toByte())
        val version = 1.toByte()

        FileInputStream(inputFile).use { input ->
          reactApplicationContext.contentResolver.openOutputStream(destUri, "w")
            ?.use { output ->
              // Header: magic(4) + version(1) + iterations(4) + salt(16) + nonce(12)
              output.write(magic)
              output.write(byteArrayOf(version))
              output.write(byteArrayOf(
                ((iterations ushr 24) and 0xFF).toByte(),
                ((iterations ushr 16) and 0xFF).toByte(),
                ((iterations ushr 8) and 0xFF).toByte(),
                (iterations and 0xFF).toByte(),
              ))
              output.write(salt)
              output.write(nonce)

              val buf = ByteArray(64 * 1024)
              while (true) {
                ensureActive()
                val read = input.read(buf)
                if (read <= 0) break

                val out = cipher.update(buf, 0, read)
                if (out != null && out.isNotEmpty()) output.write(out)

                processed += read

                val now = nowMs()
                if (now - lastEmit >= 200) {
                  lastEmit = now
                  emitProgress(jobId, null, "encrypt", processed, total)
                }
              }

              val finalBytes = cipher.doFinal()
              if (finalBytes.isNotEmpty()) output.write(finalBytes)
              output.flush()
            } ?: throw IllegalStateException("Failed to open destination output stream")
        }

        emitProgress(jobId, null, "encrypt", total, total)

        val result = Arguments.createMap().apply {
          putBoolean("ok", true)
          putString("uri", destUri.toString())
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
  fun deleteItem(folderId: String, itemId: String, promise: Promise) {
    scope.launch {
      try {
        val root = getVaultRootDir()
        val itemsDir = File(File(File(root, "folders"), folderId), "items")
        val encFile = File(itemsDir, "$itemId.enc")
        val metaFile = File(itemsDir, "$itemId.json")

        val okEnc = if (encFile.exists()) encFile.delete() else true
        val okMeta = if (metaFile.exists()) metaFile.delete() else true
        val ok = okEnc && okMeta
        promise.resolve(ok)
      } catch (_: Exception) {
        promise.resolve(false)
      }
    }
  }
}
