<?php

namespace Ozmos\Viper;

use Illuminate\Support\Facades\Blade;
use Ozmos\Viper\Commands\CompileCommand;
use Ozmos\Viper\Commands\ConfigCommand;
use Ozmos\Viper\Commands\GenerateCommand;
use Ozmos\Viper\Commands\InvertCommand;
use Ozmos\Viper\Extractors\AdjacentExtractor;
use Ozmos\Viper\Extractors\PhpExtractor;
use Ozmos\Viper\Extractors\ReactSfcExtractor;
use Ozmos\Viper\Extractors\VueSfcExtractor;
use Ozmos\Viper\Generators\ReactGenerator;
use Ozmos\Viper\Generators\RouteGenerator;
use Ozmos\Viper\Generators\VueGenerator;
use Ozmos\Viper\Inverters\ModeInverter;
use Ozmos\Viper\Inverters\ReactInverter;
use Ozmos\Viper\Inverters\VueInverter;
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

        $this->app->bind(RouteGenerator::class, function () {
            return match (config('viper.framework')) {
                'react' => new ReactGenerator(),
                default => new VueGenerator(),
            };
        });

        $this->app->singleton(ViperConfig::class, function () {
            return new ViperConfig(...config('viper'));
        });

        $this->app->bind(PhpExtractor::class, function () {
            if (config('viper.mode') === 'adjacent') {
                return new AdjacentExtractor();
            }

            if (config('viper.framework') === 'react') {
                return new ReactSfcExtractor();
            }

            return new VueSfcExtractor();
        });

        $this->app->bind(ModeInverter::class, function () {
            if (config('viper.framework') === 'react') {
                return new ReactInverter();
            }

            return new VueInverter();
        });
    }
}
