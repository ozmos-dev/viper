<?php

namespace Ozmos\Viper\Extractors;

use Illuminate\Support\Facades\File;

class AdjacentExtractor implements PhpExtractor
{
    public function extract(string $filename): string
    {
        $extension = pathinfo($filename, PATHINFO_EXTENSION);

        $filename = str($filename)->replaceEnd('.'.$extension, '.php');

        if (! File::exists($filename)) {
            return str('');
        }

        $componentFile = File::get($filename);

        return str($componentFile)->replaceStart('<?php', '')->toString();
    }
}
