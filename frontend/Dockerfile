# Use official Node.js LTS image
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the Next.js app
RUN npm run build

# Expose the frontend port
EXPOSE 5000

# Start the Next.js app on port 5000
CMD ["npm", "run", "start", "--", "-p", "5000"] 