# Build a tiny static server image using nginx
# This project is a static site (HTML/CSS/JS). Use nginx to serve the files.
FROM nginx:alpine

# Remove the default nginx html (optional) and copy site files into the web root
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html/

# Expose port 80 and run nginx in the foreground
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]