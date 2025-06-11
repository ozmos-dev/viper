
{
@if($route['path'] === "/")
  index: true,
@elseif(!empty($route['path']))
  path: "{{ $route['path'] }}",
@endif
@if(empty($route['children']))
  lazy: async () => {
    return {
        Component: (await import("./{{ $route['relativePath'] }}")).default,
        loader: reactRouterLoader,
    };
  },
@else
  children: [
    {
      lazy: async () => {
        return {
            Component: (await import("./{{ $route['relativePath'] }}")).default,
            loader: reactRouterLoader,
        };
      },
      children: [
        @foreach($route['children'] as $child)

          @include('viper::react-route-object', ['route' => $child])

        @endforeach
      ]
    }
  ],
@endif
},
