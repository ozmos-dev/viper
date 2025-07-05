<?php

namespace Ozmos\Viper\Attrs;

use Attribute;

#[Attribute(Attribute::TARGET_PARAMETER)]
class Bind
{
    public function __construct(
        public string $column = 'id',
    ) {}
}
