# NotificationModule - Notificaciones Nativas con Botones en Android

Este módulo permite enviar notificaciones nativas en Android con botones de acción dinámicos desde React Native.

## 🎯 Características

- ✅ Enviar notificaciones con botones personalizados
- ✅ Manejar acciones sin abrir la app
- ✅ Soporte para múltiples tipos de iconos
- ✅ Integración perfecta con React Native
- ✅ Fallback automático a expo-notifications

## 📦 Archivos Creados

### Kotlin (Android Nativo)

- `NotificationModule.kt` - Módulo principal para enviar notificaciones
- `NotificationPackage.kt` - Package para registrar el módulo
- `NotificationActionReceiver.kt` - BroadcastReceiver para manejar acciones
- `RestartServiceReceiver.kt` - Receiver para reiniciar servicios

### TypeScript (React Native)

- `app/utils/modules/NotificationModule.ts` - Puente TypeScript
- `types/typesNotifications.ts` - Tipos exportados

### Configuración

- `app/native/modules/modules.json` - Registro de módulos para prebuild

## 🚀 Uso

### 1. Enviar notificación simple (sin botones)

```typescript
import { useNotifications } from "@/context/NotificationsContext";

const { sendNotification } = useNotifications();

await sendNotification({
  title: "¡Hola!",
  message: "Esta es una notificación simple",
  type: "info",
});
```

### 2. Enviar notificación con botones

```typescript
await sendNotification({
  title: "Batería baja",
  message: "Tu batería está por debajo del 20%",
  type: "warning",
  actions: [
    { actionId: "dismiss", title: "Descartar", icon: "delete" },
    { actionId: "settings", title: "Configuración", icon: "settings" },
  ],
});
```

### 3. Manejar acciones de botones

Las acciones se manejan automáticamente en `NotificationsContext.tsx`:

```typescript
// Listener para acciones de notificaciones nativas
useEffect(() => {
  if (Platform.OS !== "android") return;

  const { DeviceEventEmitter } = require("react-native");

  const subscription = DeviceEventEmitter.addListener(
    "onNotificationAction",
    (event: {
      actionId: string;
      notificationId: number;
      title: string;
      message: string;
    }) => {
      switch (event.actionId) {
        case "dismiss":
          NotificationModule.cancelNotification(event.notificationId);
          break;
        case "settings":
          // Navegar a configuración
          navigation.navigate("Settings");
          break;
        case "copy":
          // Copiar al portapapeles
          ExpoClipboard.setStringAsync(event.message);
          break;
        default:
          break;
      }
    },
  );

  return () => subscription.remove();
}, []);
```

## 🎨 Iconos Disponibles

Los iconos disponibles para los botones son:

- `"pause"` - Icono de pausa
- `"play"` - Icono de reproducir
- `"stop"` - Icono de detener
- `"delete"` - Icono de eliminar
- `"info"` - Icono de información
- `"settings"` - Icono de configuración

## 📝 Tipos

```typescript
export type NotificationAction = {
  actionId: string; // ID único para identificar la acción
  title: string; // Texto del botón
  icon?: "pause" | "play" | "stop" | "delete" | "info" | "settings";
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  timestamp: Date;
  trigger?: Notifications.NotificationTriggerInput;
  actions?: NotificationAction[]; // ← Botones opcionales
};
```

## 🔧 Métodos del Módulo

### `createNotificationChannel(channelId, channelName, importance)`

Crea un canal de notificación (requerido para Android 8.0+).

```typescript
NotificationModule.createNotificationChannel(
  "my_channel",
  "My Notifications",
  3, // IMPORTANCE_HIGH
);
```

### `sendNotification(notificationId, title, message, channelId, actions?)`

Envía una notificación con botones opcionales.

```typescript
await NotificationModule.sendNotification(
  123456,
  "Título",
  "Mensaje",
  "my_channel",
  [
    { actionId: "action1", title: "Botón 1", icon: "info" },
    { actionId: "action2", title: "Botón 2", icon: "settings" },
  ],
);
```

### `cancelNotification(notificationId)`

Cancela una notificación específica.

```typescript
NotificationModule.cancelNotification(123456);
```

### `cancelAllNotifications()`

Cancela todas las notificaciones.

```typescript
NotificationModule.cancelAllNotifications();
```

## 📱 Ejemplo Completo

```typescript
import { useNotifications } from "@/context/NotificationsContext";
import { Platform, DeviceEventEmitter } from "react-native";
import NotificationModule from "@/utils/modules/NotificationModule";

export const MyComponent = () => {
  const { sendNotification } = useNotifications();

  // Configurar listener de acciones
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = DeviceEventEmitter.addListener(
      "onNotificationAction",
      async (event) => {
        console.log("Acción:", event.actionId);

        if (event.actionId === "snooze") {
          // Re-enviar notificación en 5 minutos
          setTimeout(() => {
            sendNotification({
              title: event.title,
              message: event.message,
              type: "info",
            });
          }, 5 * 60 * 1000);
        }
      }
    );

    return () => subscription.remove();
  }, []);

  const handleShowNotification = async () => {
    await sendNotification({
      title: "Recordatorio",
      message: "Tienes una tarea pendiente",
      type: "info",
      actions: [
        { actionId: "dismiss", title: "Descartar", icon: "delete" },
        { actionId: "snooze", title: "Posponer", icon: "pause" },
        { actionId: "view", title: "Ver", icon: "info" },
      ],
    });
  };

  return (
    <Button title="Mostrar Notificación" onPress={handleShowNotification} />
  );
};
```

## 🔄 Flujo de Funcionamiento

1. **React Native**: Llamas a `sendNotification()` con botones
2. **NotificationModule.ts**: Detecta si hay botones y es Android
3. **NotificationModule.kt**: Crea la notificación nativa con botones
4. **Usuario**: Presiona un botón en la notificación
5. **NotificationActionReceiver.kt**: Recibe la acción
6. **DeviceEventEmitter**: Envía evento a React Native
7. **NotificationsContext.tsx**: Maneja la acción en tu código

## 🛠️ Compilación

Ejecuta el prebuild para copiar los módulos nativos:

```bash
cd app
npm run prebuild
```

Esto copiará automáticamente todos los archivos a las ubicaciones correctas y registrará los receivers en el `AndroidManifest.xml`.

## ⚠️ Notas Importantes

- Los botones solo funcionan en **Android nativo**, no en iOS ni Web
- En iOS y Web, se usa `expo-notifications` como fallback (sin botones)
- Máximo 3 botones por notificación (limitación de Android)
- Los iconos son los nativos de Android (no puedes usar iconos personalizados sin recursos adicionales)

## 🐛 Troubleshooting

### Los botones no aparecen

- Verifica que estés en Android
- Asegúrate de que `actions` tenga al menos un elemento
- Comprueba que el prebuild se ejecutó correctamente

### Las acciones no se ejecutan

- Verifica que el listener esté configurado antes de enviar la notificación
- Revisa los logs con `adb logcat | grep Notification`
- Asegúrate de que el `actionId` coincida en el switch

### El módulo no se encuentra

- Ejecuta `npm run prebuild` de nuevo
- Limpia el build: `cd android && ./gradlew clean`
- Reconstruye: `npx expo run:android`
