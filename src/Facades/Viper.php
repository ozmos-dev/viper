<?php

namespace Ozmos\Viper\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \Ozmos\Viper\Viper
 */
class Viper extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \Ozmos\Viper\Viper::class;
    }
}
