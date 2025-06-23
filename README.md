# RawenChat 😺

Una experiencia de chat minimalista y elegante para tus transmisiones en vivo de Twitch.

![RawenChat Banner](https://rawenchat.vercel.app/banner.png) <!-- Add a banner image if you have one -->

## ✨ Características

- **Conexión rápida y fácil** a tu canal de Twitch
- **Soporte para mensajes de texto a voz (TTS)** - Escucha los mensajes del chat
- **Interfaz limpia y sin distracciones** - Perfecta para overlays
- **Compatible con OBS** y otras plataformas de transmisión
- **Fácil uso y sin costo alguno**
- **Open Source** - Código abierto en GitHub
- **Modo oscuro/claro** automático
- **Auto-scroll** configurable
- **Diseño responsive**

## 🚀 Cómo usar RawenChat

### Método 1: Uso directo (Recomendado)

1. **Visita la aplicación web**: [RawenChat Live](https://rawenchat.vercel.app) <!-- Replace with your actual domain -->

2. **Ingresa tu canal de Twitch**: 
   - Escribe el nombre de tu canal en el campo de texto
   - Ejemplo: Si tu canal es `twitch.tv/rawencat`, solo escribe `rawencat`

3. **Haz clic en "Iniciar Chat"**

4. **¡Listo!** Ya puedes ver los mensajes de tu chat en tiempo real

### Método 2: Para uso en OBS

1. **Agrega una nueva fuente** en OBS
2. **Selecciona "Navegador"**
3. **Copia la URL**: `https://rawenchat.vercel.app/chat/[tu-canal]/obs?tts=false&render=true`
   - Reemplaza `[tu-canal]` con el nombre de tu canal
   - Ejemplo: `https://rawenchat.vercel.app/[tu-canal]/rawencat/obs?tts=false&render=true`
4. **Configura las dimensiones**:
5. **Marca "Actualizar navegador cuando la escena se vuelve activa"**
6. - Abre en tu navegador lo mismo pero `https://rawenchat.vercel.app/[tu-canal]/rawencat/obs?tts=true&render=false`
- Esto hara que el navegador te diga el chat, y el obs lo renderize

## 🛠️ Instalación para desarrollo

Si quieres ejecutar RawenChat localmente o contribuir al proyecto:

### Prerrequisitos

- Node.js
- pnpm 

### Pasos

1. **Clona el repositorio**:
```bash
git clone https://github.com/RevenzMind/RawenChat.git
cd RawenChat
```

2. **Instala las dependencias**:
```bash
# Con pnpm (recomendado)
pnpm install

```

3. **Ejecuta en modo desarrollo**:
```bash
# Con pnpm
pnpm dev

```

4. **Abre tu navegador** en `http://localhost:3000`

### Scripts disponibles

```bash
npm run dev     # Ejecuta en modo desarrollo con Turbopack
npm run build   # Construye la aplicación para producción
npm run start   # Inicia el servidor de producción
npm run lint    # Ejecuta el linter
```

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── chat/[channel]/
│   │   ├── obs/
│   │   │   └── page.tsx          # Vista optimizada para OBS
│   │   └── page.tsx              # Vista principal del chat
│   ├── components/
│   │   ├── chat/
│   │   │   └── messagesRender.tsx # Renderizado de mensajes
│   │   └── header.tsx            # Componente del header
│   ├── favicon.ico/
│   │   └── route.ts              # Favicon dinámico
│   ├── globals.css               # Estilos globales
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Página de inicio
public/                           # Archivos estáticos
```

## ⚙️ Configuración

### Funciones disponibles

- **TTS (Text-to-Speech)**: Activa/desactiva la lectura de mensajes
- **Auto Scroll**: El chat se desplaza automáticamente con nuevos mensajes
- **Modo OBS**: Vista optimizada para overlays sin controles

### Para streamers

Para usar RawenChat en tu stream:

1. **URL para overlay**: `https://rawenchat.vercel.app/[tu-canal]/rawencat/obs?tts=aflse&render=true`
2. **Dimensiones recomendadas**: 300x600px
3. **Posición**: Lateral derecho o izquierdo de la pantalla

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si quieres mejorar RawenChat:

1. **Fork** el repositorio
2. **Crea una rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre un Pull Request**

## 📝 Tecnologías utilizadas

- **[Next.js 15](https://nextjs.org/)** - Framework de React
- **[React 19](https://react.dev/)** - Biblioteca de UI
- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework de CSS
- **[tmi.js](https://github.com/tmijs/tmi.js)** - Cliente de Twitch IRC
- **[@lobehub/fluent-emoji](https://github.com/lobehub/lobe-ui)** - Emojis animados

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🐛 Reportar bugs

Si encuentras algún problema:

1. **Revisa** si el issue ya existe en [GitHub Issues](https://github.com/RevenzMind/RawenChat/issues)
2. **Crea un nuevo issue** con:
   - Descripción detallada del problema
   - Pasos para reproducirlo
   - Screenshots si es necesario
   - Información del navegador/OS

## 💖 Apoya el proyecto

Si RawenChat te ha sido útil:

- ⭐ **Dale una estrella** al repositorio
- 🐛 **Reporta bugs** que encuentres
- 💡 **Sugiere nuevas características**
- 🤝 **Contribuye** con código
- 📢 **Comparte** el proyecto con otros streamers

## 📞 Contacto

- **GitHub**: [@RevenzMind](https://github.com/RevenzMind)
- **Twitch**: [@rawencat](https://twitch.tv/rawencat) <!-- Add your Twitch channel -->
- **Twitter**: [@tu_twitter] <!-- Add your Twitter -->

---

**¿Te gusta RawenChat?** ¡Dale una ⭐ al repositorio y compártelo con otros streamers!