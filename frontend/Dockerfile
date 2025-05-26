# ---- Stage 1: Build ----
# Use an official Node runtime as a parent image for the build stage
FROM node:24-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the frontend application code
COPY . .

# Build the React application for production
RUN npm run build

# ---- Stage 2: Serve ----
# Use a lightweight Nginx image
FROM nginx:stable-alpine

# Copy the built assets from the 'builder' stage to Nginx's default public directory
COPY --from=builder /app/build /usr/share/nginx/html

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 4999 for Nginx
EXPOSE 4999

# Add a wrapper script
COPY entrypoint-wrapper.sh /entrypoint-wrapper.sh
RUN chmod +x /entrypoint-wrapper.sh

# Use the wrapper script as the command
CMD ["/entrypoint-wrapper.sh"]