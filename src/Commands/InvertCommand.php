<?php

namespace Ozmos\Viper\Commands;

use Illuminate\Console\Command;
use Ozmos\Viper\Inverters\ModeInverter;
use Ozmos\Viper\ViperConfig;
use Symfony\Component\Finder\Finder;

class InvertCommand extends Command
{
    protected $signature = 'viper:invert';

    protected $description = 'Turns SFC into adjacent and vice versa';

    public function handle()
    {
        $inverter = app(ModeInverter::class);

        $this->warn('This will directly modify your files. Make sure you have a backup.');

        if (!$this->confirm('Are you sure you want to continue?')) {
            $this->line('Aborting...');
            return;
        }

        if (app(ViperConfig::class)->isSfc()) {
            $inverter->toAdjacent();
        } else {
            $inverter->toSfc();
        }

        $this->info('Done!');
    }
}
