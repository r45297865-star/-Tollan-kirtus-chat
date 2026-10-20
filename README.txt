# Tollan Kirtus Chat

Chat global anónimo para una tarea escolar.

## Lo que hace

- Cada visitante inicia sesión anónimamente con Firebase.
- Se le asigna automáticamente `user1`, `user2`, `user3`, etc.
- Los mensajes aparecen en tiempo real para todos los visitantes.
- El mensaje queda asociado al usuario anónimo de Firebase, no a un nombre personal.
- El fondo usa la imagen `fondo.png`.
- La interfaz funciona en celular y computadora.
- Los mensajes tienen un campo `expireAt` para que Firestore pueda eliminarlos después de 2 días.
- La interfaz también oculta mensajes con más de 2 días.

## Configuración

1. Entra a Firebase Console y crea un proyecto.
2. Registra una aplicación web.
3. En Authentication activa el proveedor **Anonymous**.
4. Crea una base de datos de **Cloud Firestore**.
5. Copia la configuración de Firebase que te da Firebase en `app.js`, dentro de `firebaseConfig`.
6. Publica las reglas de `firestore.rules`.
7. En Firestore crea una política **TTL** para el campo `expireAt` de la colección `messages`.
   - Firebase Console > Firestore > Time-to-live (TTL)
   - Campo: `expireAt`
8. Para probar localmente puedes abrir el proyecto con un servidor local, por ejemplo VS Code + Live Server.

## Importante sobre "global"

HTML/CSS/JS por sí solos no pueden compartir mensajes entre personas de todo el mundo.
Firebase es el servidor/base de datos que hace posible que todos vean el mismo chat.

## Nota sobre el borrado de 2 días

La consulta de la página deja fuera los mensajes antiguos inmediatamente.
La eliminación física mediante TTL de Firestore puede tardar un poco después de cumplirse el tiempo; no debe considerarse un borrado al segundo exacto.

## Seguridad básica

Las reglas impiden que un visitante escriba mensajes con el UID de otra persona y limitan los mensajes a 500 caracteres.
Para una página pública real convendría añadir moderación, reportes y límites contra spam.
