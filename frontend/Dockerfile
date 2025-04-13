# ---- Stage 1: Build ----
# Use an official Node runtime as a parent image for the build stage
FROM node:18-alpine as builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./
# If using yarn:
# COPY yarn.lock ./

# Install dependencies
RUN npm ci
# If using yarn:
# RUN yarn install --frozen-lockfile

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

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]