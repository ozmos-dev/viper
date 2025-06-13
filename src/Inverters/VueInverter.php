<?php

namespace Ozmos\Viper\Inverters;

use Ozmos\Viper\Extractors\VueSfcExtractor;
use Ozmos\Viper\ViperConfig;
use Symfony\Component\Finder\Finder;

class VueInverter
{
    public function toSfc()
    {
        $pagesDir = app(ViperConfig::class)->pagesPath();
        $phpFiles = collect(Finder::create()->files()->in($pagesDir)->name('*.php'));

        foreach ($phpFiles as $phpFile) {
            $phpContent = file_get_contents($phpFile);
            $phpContent = preg_replace('/^<\?php\s*/', '', $phpContent);

            $vueFile = preg_replace('/\.php$/', '.vue', $phpFile);
            if (file_exists($vueFile)) {
                $vueContent = file_get_contents($vueFile);
                $vueContent = preg_replace(VueSfcExtractor::PATTERN, '', $vueContent); // remove existing <php> blocks
                $vueContent .= "\n<php>\n".trim($phpContent)."\n</php>\n";
                file_put_contents($vueFile, $vueContent);
            }

            unlink($phpFile);
        }
    }

    public function toAdjacent()
    {
        $pagesDir = app(ViperConfig::class)->pagesPath();
        $vueFiles = collect(Finder::create()->files()->in($pagesDir)->name('*.vue'));

        foreach ($vueFiles as $vueFile) {
            $content = file_get_contents($vueFile);

            if (preg_match(VueSfcExtractor::PATTERN, $content, $matches)) {
                $phpContent = "<?php\n".trim($matches[1])."\n";
                $phpFile = preg_replace('/\.vue$/', '.php', $vueFile);
                file_put_contents($phpFile, $phpContent);

                $newVueContent = preg_replace(VueSfcExtractor::PATTERN, '', $content);
                file_put_contents($vueFile, $newVueContent);
            }
        }
    }
}
