<?php

namespace Ozmos\Viper\Tests;

use Illuminate\Support\Facades\File;
use Ozmos\Viper\ViperConfig;

class World
{
    public function __construct(
        public string $rootPath,
    ) {}

    public function beforeEach()
    {
        app()->singleton(ViperConfig::class, function () {
            return new ViperConfig(
                output_path: $this->rootPath.'/.viper',
                pages_path: $this->rootPath.'/pages',
                framework: 'vue',
                mode: 'sfc',
            );
        });
    }

    public function cleanup()
    {
        File::deleteDirectory($this->rootPath);
    }
}
