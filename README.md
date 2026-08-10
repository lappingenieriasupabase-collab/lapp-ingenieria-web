# LAPP Ingeniería — Sitio web

Sitio estático (HTML + CSS + JavaScript, sin build) para LAPP Ingeniería S.A.S., Bogotá.

## Páginas

| Archivo | Contenido |
|---|---|
| `index.html` | Inicio. Hero en carrusel (vídeo + imágenes), frentes de trabajo, capacidades, proyectos, clientes y contacto. |
| `servicios.html` | Las cuatro líneas de servicio en detalle y los servicios complementarios. |
| `datacenter.html` | Infraestructura para datacenter. |
| `por-que-escogernos.html` | Argumentos de venta y diferenciales. |
| `brochure.html` | Brochure corporativo: presentación horizontal de 12 paneles. |

## Estructura

```
assets/
  site.css        Sistema de diseño y estilos de todas las páginas salvo el brochure
  site.js         Nav, carrusel del hero, animaciones GSAP y marquesina de clientes
  contacto.js     Compositor de mensaje, formulario en vivo y asistente de WhatsApp
  brochure.css    Estilos exclusivos del brochure
  brochure.js     Recorrido horizontal del brochure
  *.mp4 *.jpg     Material audiovisual
vercel.json       Cabeceras de caché y seguridad
sitemap.xml       Mapa del sitio
robots.txt
```

Dependencias externas: **GSAP + ScrollTrigger** por CDN y las tipografías de Google Fonts. No hay paquetes que instalar.

## Desarrollo local

No requiere compilación. Basta con servir la carpeta:

```bash
npx serve .
```

Abrir los archivos con doble clic también funciona, aunque conviene usar un servidor para que el navegador trate las rutas igual que en producción.

## Despliegue en Vercel

1. Subir esta carpeta (`lapp/`) como raíz del repositorio de GitHub.
2. En Vercel: **Add New → Project** e importar el repositorio.
3. Framework Preset: **Other**. Sin comando de build ni carpeta de salida.
4. Si el repositorio contiene la carpeta padre, indicar `lapp` en **Root Directory**.

`vercel.json` ya define caché larga para `assets/` y revalidación en los HTML, de modo que un cambio de contenido se ve de inmediato sin sacrificar el rendimiento de las imágenes y vídeos.

## Antes de publicar

- Ajustar el dominio en `sitemap.xml` y `robots.txt` si no será `lappingenieria.com`.
- Los textos de servicios y diferenciales fueron redactados a partir del contenido del sitio anterior: conviene que la gerencia los apruebe.
- Los logotipos de clientes se publican con su autorización.

## Notas de mantenimiento

- **Los vídeos pesan ~80 MB en total.** Es lo que más afecta la velocidad de carga; comprimirlos a 1080p con un bitrate menor (HandBrake o `ffmpeg`) reduciría el peso de forma notable sin pérdida visible.
- El teléfono de WhatsApp está en `assets/contacto.js`, en la constante `WA_NUMBER`.
- Los datos de contacto se repiten en el pie y en la sección de contacto de cada página.
