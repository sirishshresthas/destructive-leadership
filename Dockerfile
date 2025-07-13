# Step 1: Use Node.js 20 with a smaller attack surface than Alpine
FROM node:current-alpine3.22 AS base

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --frozen-lockfile

# Copy app files
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the default Next.js port
EXPOSE 3000

# Start the production server
CMD ["npm", "start"]
