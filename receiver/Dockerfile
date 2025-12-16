FROM php:8.2-apache
WORKDIR /var/www/html
COPY index.php .
COPY js/ ./js/
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html
EXPOSE 80