<?php

namespace Ozmos\Viper\Attrs;

#[\Attribute(\Attribute::TARGET_CLASS)]
class Name
{
    public function __construct(public string $name) {}
}
