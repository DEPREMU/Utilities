package com.package.name

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

object KeyboardCommandRepository {
    sealed class Command {
        data class CommitText(val text: String) : Command()
        object Delete : Command()
        object Enter : Command()
        data class SetLayout(val layout: List<List<String>>) : Command()
        object ResetLayout : Command()
        data class SetInputMode(val mode: String) : Command()
    }

    private val _commands = MutableSharedFlow<Command>(extraBufferCapacity = 10)
    val commands: SharedFlow<Command> = _commands
    private val commandScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    fun sendCommand(command: Command) {
        if (_commands.tryEmit(command)) return

        commandScope.launch {
            _commands.emit(command)
        }
    }
}
