<?php

namespace Ozmos\Viper\Commands;

use Illuminate\Console\Command;
use Ozmos\Viper\Facades\Viper;
use Ozmos\Viper\VueRouterConfigGenerator;

class GenerateCommand extends Command
{
    protected $signature = 'viper:generate';

    protected $description = 'Generate the routes file';

    public function handle()
    {
        (new VueRouterConfigGenerator)->generate(Viper::pageComponents());
    }
}
