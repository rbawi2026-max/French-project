FROM node:24-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npm run build
FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/escape/content.ts ./src/escape/content.ts
COPY --from=build /app/server ./server
COPY --from=build /app/serve.mjs ./serve.mjs
ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
CMD ["node", "serve.mjs"]
