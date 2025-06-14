<?php

namespace Ozmos\Viper\Attrs;

#[\Attribute(\Attribute::TARGET_CLASS)]
class Middleware
{
    public function __construct(
        public string|array $middleware,
    ) {
        $this->middleware = is_array($middleware) ? $middleware : [$middleware];
    }
}
