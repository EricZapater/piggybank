FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Export static files
RUN npx expo export --platform web --output-dir dist

# Create manifest.json if it doesn't exist
RUN if [ ! -f dist/manifest.json ]; then \
    echo '{"short_name":"Piggybank","name":"Piggybank","description":"Estalvia amb la teva parella o pel teu compte.","icons":[{"src":"/icon.png","sizes":"512x512","type":"image/png","purpose":"any"},{"src":"/icon.png","sizes":"512x512","type":"image/png","purpose":"maskable"}],"start_url":"/","display":"standalone","theme_color":"#ffffff","background_color":"#ffffff","orientation":"portrait"}' > dist/manifest.json; \
    fi

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]