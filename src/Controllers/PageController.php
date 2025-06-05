<?php

namespace Ozmos\Viper\Controllers;

use Ozmos\Viper\Facades\Viper;

class PageController
{
    public function __invoke(string $path)
    {
        $page = Viper::resolvePageComponent($path);

        if (request()->isMethod('post')) {
            return $page->action(request()->header('x-viper-action')) ?? [];
        }

        $only = str(request()->header('x-viper-only', ''))->explode(',')->toArray();

        $params = $page->routeParameters()->mapWithKeys(fn ($key) => [$key => request()->route()->parameter($key)]);

        $data = [
            'page' => [
                'props' => $page->props(array_filter($only)),
                'actions' => array_keys($page->actions()),
                'params' => $params,
                'title' => $page->title(),
                'hashes' => $page->propHashes(),
            ],
        ];

        if (request()->header('x-viper-request') === 'true') {
            return response()->json($data['page']);
        }

        return view('app', $data);
    }
}
