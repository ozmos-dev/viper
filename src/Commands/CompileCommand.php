<?php

namespace Ozmos\Viper\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Ozmos\Viper\Compiler;
use Ozmos\Viper\ViperConfig;

class CompileCommand extends Command
{
    protected $signature = 'viper:compile {--filename=} {--write=true} {--transform=true}';

    protected $description = 'Compiles the php contents of a viper file';

    public function handle()
    {
        $compiler = new Compiler(
            filename: $this->option('filename'),
            write: $this->option('write') === 'true',
        );

        $output = $compiler->compile();

        $extension = pathinfo($this->option('filename'), PATHINFO_EXTENSION);
        $relativePath = str($this->option('filename'))->replaceStart(app(ViperConfig::class)->pagesPath(), '')->replaceStart('/', '')->replaceEnd('.'.$extension, '');

        if ($this->option('write') === 'true') {
            echo 'Compiled '.$relativePath;
            if ($this->option('transform') === 'true') {
                Artisan::call('viper:generate');
            }
        } else {
            $this->line($output);
        }

        return Command::SUCCESS;
    }
}
