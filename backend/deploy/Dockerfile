# ==============================================================
#  NWC backend — Dockerfile production multi-stage
#  Build : docker build -t nwc-backend -f deploy/Dockerfile .
#  Run   : utilisé via docker-compose.prod.yml (cf même dossier)
# ==============================================================

# --- Stage 1 : composer install ---
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

# --- Stage 2 : runtime PHP-FPM ---
FROM php:8.3-fpm-alpine

# Dépendances système : git, libs pour extensions PHP, supervisord
RUN apk add --no-cache \
    bash \
    git \
    libpng-dev libjpeg-turbo-dev freetype-dev \
    libzip-dev oniguruma-dev \
    icu-dev linux-headers \
    mariadb-client \
    supervisor

# Extensions PHP nécessaires
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        bcmath \
        gd \
        intl \
        opcache \
        pcntl \
        zip \
        sockets

# Redis (pour cache / queue / sessions si activé)
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# Configuration PHP optimisée pour la prod
COPY deploy/php-prod.ini /usr/local/etc/php/conf.d/zz-prod.ini

WORKDIR /var/www/html

# Vendor pré-installés depuis le stage composer
COPY --from=vendor /app/vendor ./vendor

# Code application
COPY . .

# Permissions storage + bootstrap/cache
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Optim Laravel post-build (cache config + routes + views)
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

EXPOSE 9000

CMD ["php-fpm"]
