<?php

namespace Ozmos\Viper\Collectors;

use Ozmos\Viper\Facades\Viper;
use Ozmos\Viper\Transformers\PageTransformer;
use Ozmos\Viper\ViperConfig;
use ReflectionClass;
use Spatie\TypeScriptTransformer\Collectors\Collector;
use Spatie\TypeScriptTransformer\Structures\TransformedType;

class PageCollector extends Collector
{
    public function getTransformedType(ReflectionClass $class): null|TransformedType
    {
        if (!str($class->getFileName())->startsWith(app(ViperConfig::class)->outputPath())) {
            return null;
        }

        $page = Viper::pageComponentFromCompiledPath($class->getFileName());

        return (new PageTransformer())->transform($class, $page->componentName());
    }
}
