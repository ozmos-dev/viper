<?php

namespace Ozmos\Viper;

use Symfony\Component\Finder\Finder;

class Viper
{
    const DEFAULT_MODEL_PATH = '\\App\\Models';

    /** @var array<string, PageComponent> */
    private array $pageComponents = [];

    private ?string $modelPath = Viper::DEFAULT_MODEL_PATH;

    public function autoDiscoverModels(string|bool $namespace = true)
    {
        if ($namespace === true) {
            $this->modelPath = Viper::DEFAULT_MODEL_PATH;

            return;
        }

        if ($namespace === false) {
            $this->modelPath = null;

            return;
        }

        $this->modelPath = $namespace;
    }

    public function resolveModel($className): ?string
    {
        if (is_null($this->modelPath)) {
            return null;
        }

        return $this->modelPath.'\\'.$className;
    }

    public function pagesPath()
    {
        return config('viper.pages_path');
    }

    public function resolvePageComponent(string $absolutePath): ?PageComponent
    {
        if (! isset($this->pageComponents[$absolutePath])) {
            $this->pageComponents[$absolutePath] = new PageComponent(
                $this->pagesPath(),
                $absolutePath,
            );
        }

        return $this->pageComponents[$absolutePath];
    }

    public function pageComponentFromCompiledPath(string $compiledPath): ?PageComponent
    {
        foreach ($this->pageComponents as $k => $pageComponent) {
            if ($pageComponent->compiledPath() === $compiledPath) {
                return $pageComponent;
            }
        }

        return null;
    }

    public function pageComponents()
    {
        return $this->pageComponents;
    }

    public function routes()
    {
        $finder = Finder::create()->files()->in(config('viper.pages_path'))->name('*.vue');

        $files = collect($finder)->sort(function ($a, $b) {
            $aScore = $this->scoreRoute($a->getRelativePathname());
            $bScore = $this->scoreRoute($b->getRelativePathname());

            if ($aScore !== $bScore) {
                return $aScore <=> $bScore;
            }

            return strlen($a->getRelativePathname()) <=> strlen($b->getRelativePathname());
        });

        foreach ($files as $file) {
            $this->resolvePageComponent($file->getRealPath())?->register();
        }
    }

  function scoreRoute(string $path): int
  {
    return str($path)->trim('/')->replaceEnd('.vue', '')->explode('/')
      ->reduce(function ($score, $segment) {
        if (str($segment)->startsWith('[') && str($segment)->endsWith(']')) {
          return $score + 10;
        }

        if (str($segment)->contains('...')) {
          return $score + 100;
        }

        return $score;
      }, 0);
  }
}
