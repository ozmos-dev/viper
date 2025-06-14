<?php

namespace Ozmos\Viper\Extractors;

interface PhpExtractor
{
    public function extract(string $filename): string;
}
