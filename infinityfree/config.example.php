<?php
/**
 * Copy this file to config.php and replace placeholders.
 * NEVER commit config.php or real credentials.
 */
return [
    'db_dsn' => 'mysql:host=YOUR_MYSQL_HOST;dbname=YOUR_DATABASE_NAME;charset=utf8mb4',
    'db_user' => 'YOUR_DATABASE_USERNAME',
    'db_password' => 'CHANGE_THIS_DATABASE_PASSWORD',
    'public_base_url' => 'https://YOUR_DOMAIN',
    'enable_online_payments' => false, // Keep false until sandbox end-to-end tests pass.
    'sslcommerz_sandbox' => true,
    'sslcommerz_store_id' => 'YOUR_SANDBOX_STORE_ID',
    'sslcommerz_store_password' => 'YOUR_SANDBOX_STORE_PASSWORD',
    // Optional: obtain these privately from your Steadfast merchant account.
    'steadfast_api_key' => '',
    'steadfast_secret_key' => '',
    'steadfast_base_url' => 'https://portal.packzy.com/api/v1'
];
