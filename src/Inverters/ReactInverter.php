<?php

namespace Ozmos\Viper\Inverters;

use Ozmos\Viper\Extractors\ReactSfcExtractor;
use Ozmos\Viper\ViperConfig;
use Symfony\Component\Finder\Finder;

class ReactInverter
{
    public function toSfc()
    {
        $pagesDir = app(ViperConfig::class)->pagesPath();
        $phpFiles = collect(Finder::create()->files()->in($pagesDir)->name('*.php'));

        foreach ($phpFiles as $phpFile) {
            $phpContent = file_get_contents($phpFile);
            $phpContent = preg_replace('/^<\?php\s*/', '', $phpContent);

            $file = preg_replace('/\.php$/', '.tsx', $phpFile);
            if (file_exists($file)) {
                $reactContent = file_get_contents($file);
                $reactContent = preg_replace(ReactSfcExtractor::PATTERN, '', $reactContent); // remove existing
                $reactContent .= "\nexport const php = /** @php */ `\n".trim($phpContent)."\n`;\n";
                file_put_contents($file, $reactContent);
            }

            unlink($phpFile);
        }
    }

    public function toAdjacent()
    {
        $pagesDir = app(ViperConfig::class)->pagesPath();
        $reactFiles = collect(Finder::create()->files()->in($pagesDir)->name('*.tsx'));

        foreach ($reactFiles as $file) {
            $content = file_get_contents($file);

            if (preg_match(ReactSfcExtractor::PATTERN, $content, $matches)) {
                $phpContent = "<?php\n".trim($matches[1])."\n";
                $phpFile = preg_replace('/\.tsx$/', '.php', $file);
                file_put_contents($phpFile, $phpContent);

                $newReactContent = preg_replace(ReactSfcExtractor::PATTERN, '', $content);
                file_put_contents($file, $newReactContent);
            }
        }
    }
}
