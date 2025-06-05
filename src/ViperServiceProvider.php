<?php

namespace Ozmos\Viper;

use Illuminate\Support\Facades\Blade;
use Ozmos\Viper\Commands\CompileCommand;
use Ozmos\Viper\Commands\ConfigCommand;
use Ozmos\Viper\Commands\GenerateCommand;
use Ozmos\Viper\Commands\InvertCommand;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class ViperServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('viper')
            ->hasConfigFile()
            ->hasViews()
            ->hasCommand(ConfigCommand::class)
            ->hasCommand(CompileCommand::class)
            ->hasCommand(InvertCommand::class)
            ->hasCommand(GenerateCommand::class);

        $this->app->singleton(Viper::class);

        Blade::directive('viper', function (string $expression) {
            return '<div id="app" data-page="{{ json_encode($page) }}"></div>';
        });

        Blade::directive('viperHead', function (string $expression) {
            return "
                <title>{{ data_get(\$page, 'title') ?: config('app.name') }}</title>
            ";
        });
    }
}
