package {{packageName}}

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

    fun sendCommand(command: Command) {
        _commands.tryEmit(command)
    }
}
