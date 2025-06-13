<?php

namespace Ozmos\Viper\Extractors;

use Illuminate\Support\Facades\File;

class ReactSfcExtractor implements PhpExtractor
{
    public const PATTERN = '/export\s+const\s+php\s*=\s*\/\*\*\s*@php\s*\*\/\s*`\s*(.*?)\s*`;/s';

    public function extract(string $filename): string
    {
        $componentFile = File::get($filename);

        return str($componentFile)->match(self::PATTERN)->toString();
    }
}
