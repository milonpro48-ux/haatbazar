<?php
declare(strict_types=1);

// Copy this file to config.local.php on the hosting account and fill it privately.
// Never commit config.local.php. Use the exact MySQL details shown by the host panel.
return [
    'db' => [
        'host' => getenv('HAATBAZAR_DB_HOST') ?: '',
        'name' => getenv('HAATBAZAR_DB_NAME') ?: '',
        'user' => getenv('HAATBAZAR_DB_USER') ?: '',
        'password' => getenv('HAATBAZAR_DB_PASSWORD') ?: '',
        'charset' => 'utf8mb4',
    ],
    'public_base_url' => getenv('PUBLIC_BASE_URL') ?: '',
    'session_name' => 'hb.sid',
    'session_secure' => true,
    'business' => [
        'legal_name' => getenv('BUSINESS_LEGAL_NAME') ?: '',
        'address' => getenv('BUSINESS_ADDRESS') ?: '',
        'phone' => getenv('BUSINESS_PHONE') ?: '',
        'support_email' => getenv('SUPPORT_EMAIL') ?: '',
        'trade_license_no' => getenv('TRADE_LICENSE_NO') ?: '',
    ],
    'integrations' => [
        'sms_api_url' => getenv('SMS_API_URL') ?: '',
        'sms_api_key' => getenv('SMS_API_KEY') ?: '',
        'courier_api_url' => getenv('COURIER_API_URL') ?: '',
        'courier_api_key' => getenv('COURIER_API_KEY') ?: '',
        'courier_api_secret' => getenv('COURIER_API_SECRET') ?: '',
        'sslcommerz_store_id' => getenv('SSLCOMMERZ_STORE_ID') ?: '',
        'sslcommerz_store_password' => getenv('SSLCOMMERZ_STORE_PASSWORD') ?: '',
        'sslcommerz_live' => filter_var(getenv('SSLCOMMERZ_LIVE') ?: 'false', FILTER_VALIDATE_BOOLEAN),
    ],
];
