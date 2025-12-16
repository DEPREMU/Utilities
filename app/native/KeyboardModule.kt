package {{packageName}}

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class KeyboardModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "KeyboardModule"

    @ReactMethod
    fun sendKey(
        key: String,
        promise: Promise,
    ) {
        try {
            val ime = reactContext.currentActivity?.let { it as? CustomKeyboard }
            ime?.commitTextToInputConnection(key)
            promise.resolve("Key sent: $key")
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun backspace(promise: Promise) {
        try {
            val ime = reactContext.currentActivity?.let { it as? CustomKeyboard }
            ime?.deleteFromInputConnection()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun enter(promise: Promise) {
        try {
            val ime = reactContext.currentActivity?.let { it as? CustomKeyboard }
            ime?.sendEnter()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }
}
