<?php

namespace Ozmos\Viper;

class VueRouterConfigGenerator
{
    private $routes = [];

    private $componentToImport = [];

    /**
     * @param  array<string, PageComponent>  $pages
     */
    public function generate(array $pages)
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

        $prevRoutes = file_get_contents(config('viper.pages_path').'/routes.ts');

        $str = view('viper::routes', ['routes' => $routes, 'pages' => $pages])->render();

        if ($prevRoutes !== $str) {
            file_put_contents(
                config('viper.pages_path').'/routes.ts',
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
        // $this->routes is a php array that looks like a vue router routes file
        // we will build a vue router route config from this routes array
        // this function should loop through all $page->layouts and try to find or create an appropriately nested layout in $this->routes
        // it should then add the page to that layouts children
        // if there are no layouts for the page, just add it to the top level routes
        // the vue router objects have this shape
        // const routes = [
        //   {
        //     path: '/admin',
        //     children: [
        //       { path: '', component: AdminOverview },
        //       { path: 'users', component: AdminUserList },
        //       { path: 'users/:id', component: AdminUserDetails },
        //     ],
        //   },
        // ]
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
