FROM php:8.2-apache

# Install the PDO MySQL extension required to connect to TiDB Cloud
RUN docker-php-ext-install pdo pdo_mysql

# Copy your application files into the web server directory
COPY . /var/www/html/

# Enable Apache mod_rewrite (standard web server routing module)
RUN a2enmod rewrite

# Expose port 80 for web traffic
EXPOSE 80
