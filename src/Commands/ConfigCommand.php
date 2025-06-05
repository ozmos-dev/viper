<?php

namespace Ozmos\Viper\Commands;

use Illuminate\Console\Command;

class ConfigCommand extends Command
{
    protected $signature = 'viper:config';

    protected $description = 'Echos viper config as json for consumption by the vite plugin';

    public function handle()
    {
        $this->line(json_encode(config('viper')));
    }
}
