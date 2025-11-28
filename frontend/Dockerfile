FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Export static files
RUN npx expo export --platform web --output-dir dist

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
    { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, \
    { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' } \
  ], \
  start_url: '/', \
  display: 'standalone', \
  theme_color: expo.web?.themeColor || '#ffffff', \
  background_color: expo.web?.backgroundColor || '#ffffff', \
  orientation: expo.orientation || 'portrait' \
}; \
fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2)); \
console.log('manifest.json generated successfully');"

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]