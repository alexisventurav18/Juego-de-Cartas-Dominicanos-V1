# Generar el APK (Capacitor)

El proyecto ya trae Capacitor configurado (`capacitor.config.ts`, iconos en `resources/`).
No hace falta tocar el código del juego.

## Antes de empezar: clave de Supabase

El modo online necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` **en el momento de compilar**.
Crea un archivo `.env` (copia de `.env.example`) con tu clave anon. Sin ella el APK abre,
y el modo contra bots offline funciona, pero crear/unirse a salas online dará error.

## Opción A: en tu PC (Node 20+, Java 21 y Android Studio)

```bash
npm install
npm run android:add      # solo la primera vez, crea la carpeta android/
npm run android:assets   # genera iconos y splash desde resources/
npm run android:apk      # compila la web, sincroniza y arma el APK
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.
Para abrirlo en Android Studio: `npm run android:open`.

## Opción B: sin instalar nada (GitHub Actions)

1. Sube el proyecto a un repositorio de GitHub.
2. En Settings > Secrets and variables > Actions agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Pestaña Actions > "Compilar APK Android" > Run workflow.
4. Al terminar, descarga el APK desde "Artifacts".

## Notas

- Ese APK es de depuración: sirve para instalar y probar directamente en el teléfono.
  Para publicar en Google Play necesitas un AAB firmado (`./gradlew bundleRelease` + tu keystore).
- Cada vez que cambies el código web: `npm run android:sync`.
- Orientación: por defecto gira con el teléfono. Para fijarla, en
  `android/app/src/main/AndroidManifest.xml` agrega `android:screenOrientation="landscape"` (o `portrait`) a `<activity>`.

## Opción C: WebIntoApp u otro empaquetador de zip

Esos servicios necesitan la web **compilada**, no el código fuente.

1. Con el `.env` ya completado: `npm install` y `npm run build`.
2. Se crea la carpeta `dist/`. Comprime **el contenido** de `dist/` (que `index.html` quede en la raíz del zip, no dentro de una subcarpeta).
3. Sube ese zip al servicio.
