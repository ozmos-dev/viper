<?php

namespace Ozmos\Viper\Generators;

use Ozmos\Viper\PageComponent;
use Ozmos\Viper\ViperConfig;

class VueGenerator implements RouteGenerator
{
    private $routes = [];

    private $componentToImport = [];

    public function generate(array $pages): void
    {
        // grab all vue components and export in a single file
        foreach ($pages as $page) {
            $this->registerComponent($page);

            if ($page->isLayout()) {
                continue;
            }

            $this->addChildToLayout($page);
        }

        $routes = str(json_encode($this->routes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES))->replaceMatches(
            '/"component":\s*"([^"]+)"/',
            fn ($matches) => '"component": '.$this->componentToImport[$matches[1]]
        )->toString();

        $routesPath = app(ViperConfig::class)->pagesPath('routes.ts');
        $prevRoutes = file_get_contents($routesPath);

        $str = view('viper::vue-routes', ['routes' => $routes, 'pages' => $pages])->render();

        if ($prevRoutes !== $str) {
            file_put_contents(
                $routesPath,
                $str,
            );
        }
    }

    private function registerComponent(PageComponent $page)
    {
        $componentName = $page->componentName();
        if (! isset($this->componentToImport[$componentName])) {
            $relativePath = $page->relativePath();
            $this->componentToImport[$componentName] = "() => import('./{$relativePath}')";
        }
    }

    private function addChildToLayout(PageComponent $page)
    {
        $componentName = $page->componentName();
        $fullPath = str($page->vueRouteFormattedPath())->trim('/')->toString();

        // If the page has no layouts, add it to the top-level routes
        if (empty($page->layouts)) {
            $routeObject = [
                'path' => $fullPath,
                'component' => $componentName,
            ];

            $this->routes[] = $routeObject;

            return;
        }

        // Start with the top-level routes array
        $currentRoutes = &$this->routes;
        $accumulatedPath = '';

        // Iterate through each layout
        foreach ($page->layouts as $layout) {
            $layoutFullPath = str($layout->vueRouteFormattedPath())->trim('/')->toString();
            $layoutComponent = $layout->componentName();

            // Try to find the layout in the current routes
            $layoutFound = false;
            foreach ($currentRoutes as &$route) {
                if ($route['component'] === $layoutComponent) {
                    // Layout found, move to its children
                    if (! isset($route['children'])) {
                        $route['children'] = [];
                    }
                    $currentRoutes = &$route['children'];
                    $accumulatedPath = $layoutFullPath;
                    $layoutFound = true;
                    break;
                }
            }

            // If layout not found, create it
            if (! $layoutFound) {
                // For nested layouts, make the path relative to parent
                $layoutRelativePath = $layoutFullPath;
                if (! empty($accumulatedPath) && str_starts_with($layoutFullPath, $accumulatedPath.'/')) {
                    $layoutRelativePath = substr($layoutFullPath, strlen($accumulatedPath) + 1);
                }

                $newLayout = [
                    'path' => $layoutRelativePath,
                    'component' => $layoutComponent,
                    'children' => [],
                ];
                $currentRoutes[] = $newLayout;

                // Get a reference to the children array of the new layout
                $lastIndex = count($currentRoutes) - 1;
                $currentRoutes = &$currentRoutes[$lastIndex]['children'];
                $accumulatedPath = $layoutFullPath;
            }
        }

        // Make the page path relative to the accumulated path
        $relativePath = $fullPath;
        if (! empty($accumulatedPath) && str_starts_with($fullPath, $accumulatedPath.'/')) {
            $relativePath = substr($fullPath, strlen($accumulatedPath) + 1);
        } elseif ($fullPath === $accumulatedPath) {
            // If the paths are identical, use empty string for index route
            $relativePath = '';
        }

        // For index pages with empty relative path, set to empty string
        if ($relativePath === '' && $page->isIndex()) {
            $relativePath = '';
        }

        // Add the page to the children of the last layout with relative path
        $routeObject = [
            'path' => $relativePath,
            'component' => $componentName,
        ];

        $currentRoutes[] = $routeObject;
    }
}
