package {{packageName}}

import android.inputmethodservice.InputMethodService
import android.view.View
import android.widget.Button
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler

class CustomKeyboard :
    InputMethodService(),
    DefaultHardwareBackBtnHandler {
    private var capsLock = false

    override fun onCreateInputView(): View {
        val view = layoutInflater.inflate(R.layout.keyboard_layout, null)

        val keys =
            listOf(
                "q",
                "w",
                "e",
                "r",
                "t",
                "y",
                "u",
                "i",
                "o",
                "p",
                "a",
                "s",
                "d",
                "f",
                "g",
                "h",
                "j",
                "k",
                "l",
                "z",
                "x",
                "c",
                "v",
                "b",
                "n",
                "m",
            )

        for (key in keys) {
            val button =
                view.findViewById<Button>(
                    resources.getIdentifier("key_$key", "id", packageName),
                )
            button.setOnClickListener {
                val char = if (capsLock) key.uppercase() else key
                commitTextToInputConnection(char)
            }
        }

        // Caps
        view.findViewById<Button>(R.id.key_caps).setOnClickListener {
            capsLock = !capsLock
        }

        // Backspace
        view.findViewById<Button>(R.id.key_backspace).setOnClickListener {
            deleteFromInputConnection()
        }

        // Enter
        view.findViewById<Button>(R.id.key_enter).setOnClickListener {
            sendEnter()
        }

        return view
    }

    fun commitTextToInputConnection(text: String) {
        currentInputConnection?.commitText(text, 1)
    }

    fun deleteFromInputConnection() {
        currentInputConnection?.deleteSurroundingText(1, 0)
    }

    fun sendEnter() {
        currentInputConnection?.sendKeyEvent(
            android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_ENTER),
        )
    }

    override fun invokeDefaultOnBackPressed() {
    }
}
