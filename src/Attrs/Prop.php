<?php

namespace Ozmos\Viper\Attrs;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD)]
class Prop
{
    public function __construct(public bool $lazy = false) {}
}
