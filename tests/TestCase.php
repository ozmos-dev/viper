<?php

namespace Ozmos\Viper\Tests;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\File;
use Orchestra\Testbench\TestCase as Orchestra;
use Ozmos\Viper\Compiler;
use Ozmos\Viper\ViperServiceProvider;
use Symfony\Component\Finder\Finder;

class TestCase extends Orchestra
{
    protected function setUp(): void
    {
        parent::setUp();

        Factory::guessFactoryNamesUsing(
            fn(string $modelName) => 'Ozmos\\Viper\\Database\\Factories\\' . class_basename($modelName) . 'Factory',
        );
    }

    protected function getPackageProviders($app)
    {
        return [
            ViperServiceProvider::class,
        ];
    }

    public function getEnvironmentSetUp($app)
    {
        config()->set('database.default', 'testing');

        /*
         * foreach (\Illuminate\Support\Facades\File::allFiles(__DIR__ . '/database/migrations') as $migration) {
         * (include $migration->getRealPath())->up();
         * }
         */
    }

    public function vueSfc()
    {
        $stubPath = __DIR__ . '/page-stubs';
        $buildPath = __DIR__ . '/build/' . str()->random(10);
        $finder = Finder::create()
            ->files()
            ->in($stubPath)
            ->name('*.php');

        File::ensureDirectoryExists($buildPath);
        File::ensureDirectoryExists($buildPath . '/.viper');
        File::ensureDirectoryExists($buildPath . '/pages');

        $world = new World($buildPath);

        $world->beforeEach();

        foreach ($finder as $file) {
            $content = str(File::get($file->getRealPath()))->replace('<?php', '')->trim()->wrap("<php>\n", "\n</php>");

            $pageFilename =
                // /Users/oz/code/viper/tests/page-stubs/(auth)/_layout.php
                str($file->getRealPath())
                    // /(auth)/_layout.php
                    ->replaceStart($stubPath, '')
                    // /Users/oz/code/viper/tests/build/{str}/(auth)/_layout.php
                    ->prepend($buildPath . '/pages')
                    ->replaceEnd('.php', '.vue');

            File::ensureDirectoryExists(dirname($pageFilename));

            File::put($pageFilename, $content);

            (new Compiler(
                filename: $pageFilename,
                write: true,
            ))->compile();
        }

        return $world;
    }
}
