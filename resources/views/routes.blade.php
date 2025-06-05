import { createWebHistory, createRouter } from 'vue-router'
import type { RouteRecordInfo } from 'vue-router';
import { route as routeFn } from 'ziggy-js';

export interface RouteNamedMap {
@foreach($pages as $page)
    @php
        $paramObj = $page->routeParameters()->isEmpty() ? 'Record<never, never>' : "{" . $page->routeParameters()->map(fn ($value) => "'$value': string")->implode(',') . "}";
    @endphp
    '{{ $page->componentName() }}': RouteRecordInfo<'{{ $page->componentName() }}', '{{ $page->vueRouteFormattedPath() }}', {!! $paramObj !!}, {!! $paramObj !!}, never>;
@endforeach
};

const routes = {!! $routes !!}

export const router = createRouter({
    history: createWebHistory(),
    routes,
});

declare module 'vue-router' {
    interface TypesConfig {
        RouteNamedMap: RouteNamedMap
    }
}

export const route: typeof routeFn = ((...args: Parameters<typeof routeFn>) => {
  args[2] = false;
  return routeFn(...args);
}) as typeof routeFn;
