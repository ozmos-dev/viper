import { route as routeFn } from 'ziggy-js';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";
import { reactRouterLoader } from "@ozmos/viper-react";

export const router = createBrowserRouter([
@foreach($routes as $route)

  @include('viper::react-route-object', ['route' => $route])

@endforeach
]);

export const route: typeof routeFn = ((...args: Parameters<typeof routeFn>) => {
  args[2] = false;
  return routeFn(...args);
}) as typeof routeFn;
