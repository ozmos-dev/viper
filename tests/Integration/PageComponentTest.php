<?php

use Illuminate\Http\Request;
use Ozmos\Viper\Facades\Viper;

$world = null;

beforeEach(function () use (&$world) {
    if (! $world) {
        $world = $this->vueSfc();
    }

    $this->world = $world;

    $this->world->beforeEach();
});

afterAll(function () use (&$world) {
    $world?->cleanup();
});

test('it assigns all nested layouts for a page', function () {
    $page = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/(auth)/login.vue',
    );

    expect($page->layouts)->toHaveCount(2);
});

test('it returns props for a page and all layouts', function () {
    $page = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/(auth)/login.vue',
    );

    expect($page->props())->toHaveKey('loginProp')->toHaveKey('authLayoutProp')->toHaveKey('rootLayoutProp');
});

test('it returns actions for a page and all layouts', function () {
    $page = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/(auth)/login.vue',
    );

    expect($page->actions())->toHaveKey('loginAction')->toHaveKey('authLayoutAction')->toHaveKey('rootLayoutAction');
});

test('it returns the correct route name for a page', function () {
    $page = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/(auth)/login.vue',
    );

    expect($page->routeName())->toEqual('auth.login');

    $index = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/index.vue',
    );

    expect($index->routeName())->toEqual('index');
});

test('it returns the correct middleware for a page', function () {
    $page = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/(auth)/login.vue',
    );

    expect($page->middleware())->toEqual(['guest']);
});

test('it returns the correct laravel route for a page', function ($path, $expected) {
    $page = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/'.$path.'.vue',
    );

    expect($page->laravelFormattedRoutePath())->toEqual($expected);
})->with([
    ['(auth)/login', 'login'],
    ['index', '/'],
    ['blog/[...slug]', 'blog/{slug?}'],
    ['posts/[id]', 'posts/{id}'],
    ['users/[user]/edit', 'users/{user}/edit'],
]);

test('it returns the correct vue route for a page', function ($path, $expected) {
    $page = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/'.$path.'.vue',
    );

    expect($page->vueRouteFormattedPath())->toEqual($expected);
})->with([
    ['(auth)/login', 'login'],
    ['index', '/'],
    ['blog/[...slug]', 'blog/:slug(.*)*'],
    ['posts/[id]', 'posts/:id'],
    ['users/[user]/edit', 'users/:user/edit'],
]);

test('it returns the correct react route for a page', function ($path, $expected) {
    $page = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/'.$path.'.vue',
    );

    expect($page->reactRouteFormattedPath())->toEqual($expected);
})->with([
    ['(auth)/login', 'login'],
    ['index', '/'],
    ['blog/[...slug]', 'blog/*'],
    ['posts/[id]', 'posts/:id'],
    ['users/[user]/edit', 'users/:user/edit'],
]);

test('it returns identical hashes for shared props', function () {
    $page = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/(auth)/login.vue',
    );

    $rootHash = $page->propHashes()['rootLayoutProp'];

    $index = Viper::resolvePageComponent(
        $this->world->rootPath.'/pages/index.vue',
    );

    expect($index->propHashes())->toHaveKey('rootLayoutProp', $rootHash);
});
