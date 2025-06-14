<?php

namespace Ozmos\Viper\Extractors;

use Illuminate\Support\Facades\File;

class VueSfcExtractor implements PhpExtractor
{
    public const PATTERN = '/<php>([\s\S]*?)<\/php>/s';

    public function extract(string $filename): string
    {
        $componentFile = File::get($filename);

        return str($componentFile)->match(self::PATTERN)->toString();
    }
}
