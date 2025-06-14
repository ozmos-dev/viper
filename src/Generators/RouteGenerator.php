<?php

namespace Ozmos\Viper\Generators;

use Ozmos\Viper\PageComponent;

interface RouteGenerator
{
    /**
     * @param  array<string, PageComponent>  $pages
     */
    public function generate(array $pages): void;
}
