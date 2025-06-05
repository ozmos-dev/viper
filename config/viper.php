<?php

// config for Ozmos/Viper
return [
    'output_path' => base_path('.viper'),

    'pages_path' => resource_path('js/pages'),

    // sfc -> <php> tag inside vue files
    // adjacent -> php files directly next to vue files ie js/pages/login.vue and js/pages/login.php
    'mode' => 'sfc',
];
