<?php

namespace Ozmos\Viper;

use Symfony\Component\Finder\Finder;

class Viper
{
    const DEFAULT_MODEL_PATH = '\\App\\Models';

    /** @var array<string, PageComponent> */
    private array $pageComponents = [];

    private null|string $modelPath = Viper::DEFAULT_MODEL_PATH;

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

    public function resolveModel($className): null|string
    {
        if (is_null($this->modelPath)) {
            return null;
        }

        if (class_exists($className)) {
            return $className;
        }

        return $this->modelPath . '\\' . $className;
    }

    public function resolvePageComponent(string $absolutePath): null|PageComponent
    {
        if (!isset($this->pageComponents[$absolutePath])) {
            $this->pageComponents[$absolutePath] = new PageComponent($absolutePath);
        }

        return $this->pageComponents[$absolutePath];
    }

    public function pageComponentFromCompiledPath(string $compiledPath): null|PageComponent
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
        $ext = app(ViperConfig::class)->isReact() ? 'tsx' : 'vue';
        $finder = Finder::create()
            ->files()
            ->in(app(ViperConfig::class)->pagesPath())
            ->name('*.' . $ext);

        $files = collect($finder)
            ->sort(function ($a, $b) {
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

    public function scoreRoute(string $path): int
    {
        return str($path)
            ->trim('/')
            ->replaceEnd('.vue', '')
            ->explode('/')
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
