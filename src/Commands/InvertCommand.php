<?php

namespace Ozmos\Viper\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Finder\Finder;

class InvertCommand extends Command
{
    protected $signature = 'viper:invert';

    protected $description = 'Turns SFC into adjacent and vice versa';

    public function handle()
    {
        $mode = config('viper.mode');
        $pagesDir = config('viper.pages_path');

        if ($mode === 'sfc') {
            $vueFiles = collect(Finder::create()->files()->in($pagesDir)->name('*.vue'));

            foreach ($vueFiles as $vueFile) {
                $content = file_get_contents($vueFile);

                if (preg_match('/<php>(.*?)<\/php>/s', $content, $matches)) {
                    $phpContent = "<?php\n".trim($matches[1])."\n";
                    $phpFile = preg_replace('/\.vue$/', '.php', $vueFile);
                    file_put_contents($phpFile, $phpContent);

                    $newVueContent = preg_replace('/<php>.*?<\/php>/s', '', $content);
                    file_put_contents($vueFile, $newVueContent);
                }
            }
        }

        if ($mode === 'adjacent') {
            $phpFiles = collect(Finder::create()->files()->in($pagesDir)->name('*.php'));

            foreach ($phpFiles as $phpFile) {
                $phpContent = file_get_contents($phpFile);
                $phpContent = preg_replace('/^<\?php\s*/', '', $phpContent);

                $vueFile = preg_replace('/\.php$/', '.vue', $phpFile);
                if (file_exists($vueFile)) {
                    $vueContent = file_get_contents($vueFile);
                    $vueContent = preg_replace('/<php>.*?<\/php>/s', '', $vueContent); // remove existing <php> blocks
                    $vueContent .= "\n<php>\n".trim($phpContent)."\n</php>\n";
                    file_put_contents($vueFile, $vueContent);
                }

                unlink($phpFile);
            }
        }

        $this->warn('DO NOT FORGET TO UPDATE config/viper.php');
        $this->info("'mode' => ".($mode === 'sfc' ? "'adjacent'" : "'sfc'"));
    }
}
