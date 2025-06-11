<?php

namespace Ozmos\Viper;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Ozmos\Viper\Attrs\Action;
use Ozmos\Viper\Attrs\Middleware;
use Ozmos\Viper\Attrs\Name;
use Ozmos\Viper\Attrs\Prop;
use Ozmos\Viper\Attrs\Title;
use Ozmos\Viper\Controllers\PageController;
use Ozmos\Viper\Facades\Viper;
use ReflectionClass;

class PageComponent
{
    private $requireInstance = null;

    public array $layouts = [];

    public function __construct(public string $basePath, public string $absolutePath)
    {
        $this->layouts = $this->getLayouts();
    }

    public function relativePath(): string
    {
        return str($this->absolutePath)->replaceFirst($this->basePath, '')->replaceStart('/', '')->toString();
    }

    public function componentExtension()
    {
        if (config('viper.framework') === 'react') {
            return 'tsx';
        }

        return 'vue';
    }

    private function getLayouts(): array
    {
        if ($this->isLayout()) {
            return [];
        }

        $parts = str($this->relativePathWithoutExtension())->explode('/');
        $layouts = [];

        $currentPath = '';

        foreach ($parts as $part) {
            if (! empty($currentPath)) {
                $currentPath .= '/';
            }
            $currentPath .= $part;

            $ext = $this->componentExtension();

            $layoutPath = str($currentPath)->dirname()->append('/_layout.'.$ext)->ltrim('.')->ltrim('/');
            $layoutAbsolutePath = $this->basePath.'/'.$layoutPath;

            if (File::exists($layoutAbsolutePath)) {
                $layouts[] = \Ozmos\Viper\Facades\Viper::resolvePageComponent($layoutAbsolutePath);
            }
        }

        return $layouts;
    }

    public function title(): string
    {
        $reflect = new ReflectionClass($this->pageInstance());

        $attrs = $reflect->getAttributes(Title::class);

        if (empty($attrs)) {
            return '';
        }

        return $attrs[0]->newInstance()->title;
    }

    public function routeParameters(): Collection
    {
        return static::parseRouteParameters($this->relativePath());
    }

    public static function parseRouteParameters(string $relativePath): Collection
    {
        return str($relativePath)->matchAll('/\[([^\]]+)\]/')->values()->map(fn ($value) => str($value)->replace('...', '')->camel()->toString());
    }

    public function relativePathWithoutExtension()
    {
        $ext = pathinfo($this->relativePath(), PATHINFO_EXTENSION);

        return str($this->relativePath())->replaceEnd('.'.$ext, '')->toString();
    }

    public function reactRouteFormattedPath()
    {
        $relativePath = $this->relativePathWithoutExtension();

        // turn file based route like (auth)/auth/verify-token/[token].tsx
        // into react route like /auth/verify-token/:token
        return str($relativePath)
          // strip out "(auth)"
            ->replaceMatches('/\(([^)]+)\)/', '')
            ->replaceMatches('/\[(\.\.\.(.*?))\]/', fn ($match) => '*')
            ->replaceMatches('/\[((.*?))\]/', fn ($match) => ':'.str($match[1])->camel()->toString())
            ->replace('...', '')
            ->replaceEnd('_layout', '')
            ->replaceEnd('index', '')
          // replace any double+ slashes resulting from stripping out previous parts
            ->replaceMatches('/\/{2,}/', '/')
            ->whenEmpty(fn () => str('/'))
            ->toString();
    }

    public function vueRouteFormattedPath()
    {
        $relativePath = $this->relativePathWithoutExtension();

        // turn file based route like (auth)/auth/verify-token/[token].vue
        // into vue route like /auth/verify-token/:token
        return str($relativePath)
          // strip out "(auth)"
            ->replaceMatches('/\(([^)]+)\)/', '')
            ->replaceMatches('/\[(\.\.\.(.*?))\]/', fn ($match) => ':'.str($match[1])->camel()->toString().'(.*)*')
            ->replaceMatches('/\[((.*?))\]/', fn ($match) => ':'.str($match[1])->camel()->toString())
            ->replace('...', '')
            ->replaceEnd('_layout', '')
            ->replaceEnd('index', '')
          // replace any double+ slashes resulting from stripping out previous parts
            ->replaceMatches('/\/{2,}/', '/')
            ->whenEmpty(fn () => str('/'))
            ->toString();
    }

    public function laravelFormattedRoutePath()
    {
        $relativePath = $this->relativePathWithoutExtension();

        // turn file based route like (auth)/auth/verify-token/[token].vue
        // into laravel route like /auth/verify-token/{token}
        return str($relativePath)
            ->replace('[', '{')
            ->replace(']', '}')
            ->replaceEnd('index', '')
          // strip out "(auth)"
            ->replaceMatches('/\(([^)]+)\)/', '')
          // camelCase params
            ->replaceMatches('/(\{(.*?)\})/', fn ($match) => str($match[1])->trim('{')->trim('}')->camel()->append('}')->prepend('{')->toString())
            ->replaceMatches('/(\{\.\.\.(.*?)\})/', fn ($match) => str($match[1])->replace('...', '')->trim('{')->trim('}')->append('?}')->prepend('{')->toString())
          // replace any double+ slashes resulting from stripping out previous parts
            ->replaceMatches('/\/{2,}/', '/')
            ->whenEmpty(fn () => str('/'))
            ->toString();
    }

    public function compiledPath(): string
    {
        $ext = $this->componentExtension();

        return config('viper.output_path').'/compiled/'.str($this->relativePath())->replaceEnd('.'.$ext, '.php');
    }

    public function pageInstance()
    {
        try {
            require_once $this->compiledPath();
            $className = '\\ViperGen\\'.$this->componentName();
            if (class_exists($className)) {
                $this->requireInstance ??= new $className;
            }
        } catch (\Throwable $th) {

        }

        return is_object($this->requireInstance) ? $this->requireInstance : new class {};
    }

    public function parseMiddleware($instance)
    {
        $reflection = new \ReflectionClass($instance);
        $attributes = $reflection->getAttributes(Middleware::class);

        if (empty($attributes)) {
            return [];
        }

        /** @var Middleware $instance */
        $instance = $attributes[0]->newInstance();

        return $instance->middleware;
    }

    public function middleware()
    {
        return collect($this->layouts)
            ->push($this)
            ->map(fn ($page) => $this->parseMiddleware($page->pageInstance()))
            ->flatten()
            ->toArray();
    }

    private function parseProps($instance, $only = [])
    {
        $reflection = new \ReflectionClass($instance);
        $props = [];

        $params = $this->getParams();

        foreach ($reflection->getMethods() as $method) {
            $attributes = $method->getAttributes(Prop::class);

            if (empty($attributes)) {
                continue;
            }

            /** @var Prop $attrInst */
            $attrInst = $attributes[0]->newInstance();

            if (! empty($only) && ! in_array($method->getName(), $only)) {
                continue;
            }

            if (empty($only) && $attrInst->lazy) {
                $props[$method->getName()] = null;

                continue;
            }

            $props[$method->getName()] = app()->call($instance->{$method->getName()}(...), $params);
        }

        return $props;
    }

    private function parsePropHashes($instance, $only = [])
    {
        $reflection = new \ReflectionClass($instance);
        $hashes = [];

        foreach ($reflection->getMethods() as $method) {
            $attributes = $method->getAttributes(Prop::class);

            if (empty($attributes)) {
                continue;
            }

            if (! empty($only) && ! in_array($method->getName(), $only)) {
                continue;
            }

            $hashes[$method->getName()] = md5($method->getFileName().$method->getName());
        }

        return $hashes;
    }

    public function propHashes($only = [])
    {
        return collect($this->layouts)
            ->push($this)
            ->mapWithKeys(fn ($page) => $this->parsePropHashes($page->pageInstance(), $only))
            ->toArray();
    }

    public function props($only = []): array
    {
        return collect($this->layouts)
            ->push($this)
            ->mapWithKeys(fn ($page) => $this->parseProps($page->pageInstance(), $only))
            ->toArray();
    }

    public function action(string $name)
    {
        $actions = $this->actions();

        if (! in_array($name, array_keys($actions))) {
            return null;
        }

        return app()->call($actions[$name]->$name(...), $this->getParams());
    }

    public function isIndex(): bool
    {
        return str($this->relativePathWithoutExtension())->endsWith('index');
    }

    public function isLayout(): bool
    {
        return str($this->relativePathWithoutExtension())->endsWith('_layout');
    }

    public function parseName($instance)
    {
        $reflection = new \ReflectionClass($instance);
        $attributes = $reflection->getAttributes(Name::class);
        if (empty($attributes)) {
            return '';
        }

        return $attributes[0]->newInstance()->name;
    }

    public function routeName(): string
    {
        // don't apply name from layouts if we arent naming the page itself
        if (! $this->parseName($this->pageInstance())) {
            return '';
        }

        return collect($this->layouts)->push($this)->map(fn (PageComponent $page) => $this->parseName($page->pageInstance()))->join('');
    }

    private function parseActions($instance)
    {
        $reflection = new \ReflectionClass($instance);
        $actions = [];

        foreach ($reflection->getMethods() as $method) {
            $attributes = $method->getAttributes(Action::class);

            if (empty($attributes)) {
                continue;
            }

            $actions[$method->getName()] = $instance;
        }

        return $actions;
    }

    public function actions()
    {
        return collect($this->layouts)
            ->push($this)
            ->mapWithKeys(fn ($page) => $this->parseActions($page->pageInstance()))
            ->toArray();
    }

    public function register()
    {
        if ($this->isLayout()) {
            return;
        }

        $path = $this->absolutePath;
        $routePath = $this->laravelFormattedRoutePath();
        $routeName = $this->routeName();
        $middleware = $this->middleware();

        $wildcardParam = $this->getWildcardName();

        $routeGet = Route::get($routePath, fn () => (new PageController)($path))
            ->middleware($middleware)
            ->name($routeName);

        $routePost = Route::post($routePath, fn () => (new PageController)($path))
            ->middleware($middleware)
            ->name($routeName);

        if ($wildcardParam) {
            $routeGet->where($wildcardParam, '.*');
            $routePost->where($wildcardParam, '.*');
        }
    }

    public static function componentNameFromPath($relativePath)
    {
        $ext = pathinfo($relativePath, PATHINFO_EXTENSION);
        $parts = str($relativePath)->replaceEnd(".".$ext, "")->explode('/');

        $name = [];

        foreach ($parts as $i => $part) {
            $part = str($part)->replace('.'.$ext, '');

            if ($part->startsWith('(')) {
                $name[] = $part->match('/\(([^)]+)\)/')->replace('...', '')->pascal().'Group';
            } elseif ($part->startsWith('[')) {
                $name[] = $part->match('/\[([^)]+)\]/')->replace('...', '')->pascal().'Param';
            } elseif ($part->endsWith('_layout')) {
                $name[] = 'Layout';
            } elseif ($i === count($parts) - 1) {
                $name[] = $part->pascal();
            } else {
                $name[] = $part->pascal();
            }
        }

        return implode('', $name);
    }

    public function componentName()
    {
        return static::componentNameFromPath($this->relativePath());
    }

    public function getParams(): array
    {
        $params = [];

        $laravelParams = request()->route()->parameters();
        foreach ($laravelParams as $key => $value) {
            $modelClass = Viper::resolveModel(str($key)->pascal()->toString());
            if (class_exists($modelClass)) {
                /** @var Model $inst */
                $inst = new $modelClass;
                $params[str($key)->camel()->toString()] = $inst->resolveRouteBinding($value);

                continue;
            }

            $params[$key] = $value;
        }

        // Handle wildcard parameters
        $wildcardParam = $this->getWildcardName();
        if ($wildcardParam && isset($laravelParams[$wildcardParam])) {
            $params[$wildcardParam] = explode('/', $laravelParams[$wildcardParam]);
        }

        return $params;
    }

    public function getWildcardName()
    {
        // find any url segments like [...foo] inside a route like /foo/[...bar]
        preg_match_all(
            '/\[\.\.\.(.*?)\]/',
            $this->relativePath(),
            $matches
        );

        // assume only a single wild card is supported rn
        return data_get($matches, '1.0');
    }
}
