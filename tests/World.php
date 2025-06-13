<?php

namespace Ozmos\Viper\Tests;

use Ozmos\Viper\ViperConfig;
use Illuminate\Support\Facades\File;

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
