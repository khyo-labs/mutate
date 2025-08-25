# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 10000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0

# Start the application
CMD ["pnpm", "start"]