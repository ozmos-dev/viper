<?php

namespace Ozmos\Viper;

use function Illuminate\Filesystem\join_paths;

class ViperConfig
{
    public function __construct(
        public string $pages_path,
        public string $output_path,
        public string $framework,
        public string $mode,
    ) {}

    public function isReact(): bool
    {
        return $this->framework === 'react';
    }

    public function isVue(): bool
    {
        return $this->framework === 'vue';
    }

    public function outputPath($path = ''): string
    {
        return join_paths($this->output_path, $path);
    }

    public function pagesPath($path = ''): string
    {
        return join_paths($this->pages_path, $path);
    }

    public function isSfc(): bool
    {
        return $this->mode === 'sfc';
    }

    public function isAdjacent(): bool
    {
        return $this->mode === 'adjacent';
    }
}
