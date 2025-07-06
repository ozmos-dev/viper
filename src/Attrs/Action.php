<?php

namespace Ozmos\Viper\Attrs;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD)]
class Action
{
    public function __construct() {}
}
