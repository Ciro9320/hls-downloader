# Base image with Node.js
FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# Install ffmpeg and other necessary system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install application dependencies
RUN npm install

# Install Playwright browser and its OS dependencies
RUN npx playwright install --with-deps chromium

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Set the environment variable for the download directory
# This allows users to map a volume to /download when running the container on ZimaOS
ENV DOWNLOAD_DIR=/download

# Create the downloads directory
RUN mkdir -p /download


# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
