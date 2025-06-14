<?php

namespace Ozmos\Viper\Commands;

use Illuminate\Console\Command;
use Ozmos\Viper\Facades\Viper;
use Ozmos\Viper\Generators\RouteGenerator;

class GenerateCommand extends Command
{
    protected $signature = 'viper:generate';

    protected $description = 'Generate the routes file';

    public function handle()
    {
        app(RouteGenerator::class)->generate(Viper::pageComponents());
    }
}
