FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Export static files
RUN npx expo export --platform web --output-dir dist

# Find and copy the icon (Expo generates it with a hash)
RUN if [ -f dist/assets/*.png ]; then \
      ICON_FILE=$(find dist/assets -name "*.png" -type f | head -n 1); \
      if [ -n "$ICON_FILE" ]; then \
        cp "$ICON_FILE" dist/icon.png; \
        echo "Icon copied successfully"; \
      fi; \
    fi || echo "No icon found in assets"

# Also check in the root assets folder and copy if exists
RUN if [ -f assets/icon.png ]; then \
      cp assets/icon.png dist/icon.png; \
      echo "Icon copied from assets/icon.png"; \
    fi

# Create a simple favicon if it doesn't exist
RUN if [ ! -f dist/favicon.ico ] && [ -f dist/icon.png ]; then \
      cp dist/icon.png dist/favicon.png; \
    fi

# Copy screenshots if they exist
RUN for i in 1 2 3 4 5; do \
      if [ -f assets/screenshot-$i.jpeg ]; then \
        cp assets/screenshot-$i.jpeg dist/screenshot-$i.jpeg; \
      fi; \
    done

# Generate manifest.json from app.json
RUN node -e "\
const fs = require('fs'); \
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8')); \
const expo = appJson.expo; \
const manifest = { \
  short_name: expo.name, \
  name: expo.name, \
  description: 'Estalvia amb la teva parella o pel teu compte.', \
  icons: [ \
    { src: '/icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, \
    { src: '/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }, \
    { src: '/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' } \
  ], \
  screenshots: [ \
    { \
      src: '/screenshot-1.jpeg', \
      sizes: '540x720', \
      type: 'image/jpeg', \
      form_factor: 'narrow' \
    } \
  ], \
  start_url: '/', \
  display: 'standalone', \
  theme_color: expo.web?.themeColor || '#ffffff', \
  background_color: expo.web?.backgroundColor || '#ffffff', \
  orientation: expo.orientation || 'portrait' \
}; \
fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));"

# Generate a basic service worker
RUN echo "self.addEventListener('install', (event) => { \
  self.skipWaiting(); \
}); \
self.addEventListener('activate', (event) => { \
  event.waitUntil(clients.claim()); \
}); \
self.addEventListener('fetch', (event) => { \
  event.respondWith(fetch(event.request)); \
});" > dist/service-worker.js

# Add manifest link and service worker registration to index.html
RUN sed -i 's|</head>|  <link rel="manifest" href="/manifest.json">\n  <link rel="icon" href="/icon.png">\n  <meta name="theme-color" content="#ffffff">\n  </head>|' dist/index.html && \
    sed -i 's|</body>|  <script>\n    if ("serviceWorker" in navigator) {\n      window.addEventListener("load", () => {\n        navigator.serviceWorker.register("/service-worker.js");\n      });\n    }\n  </script>\n  </body>|' dist/index.html

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]