<?php

namespace Ozmos\Viper\Transformers;

use Illuminate\Foundation\Http\FormRequest;
use Ozmos\Viper\Attrs\Action;
use Ozmos\Viper\Attrs\Prop;
use Ozmos\Viper\Facades\Viper;
use Ozmos\Viper\PageComponent;
use ReflectionClass;
use Spatie\TypeScriptTransformer\Structures\MissingSymbolsCollection;
use Spatie\TypeScriptTransformer\Structures\TransformedType;
use Spatie\TypeScriptTransformer\Transformers\Transformer;
use Spatie\TypeScriptTransformer\Transformers\TransformsTypes;

class PageTransformer implements Transformer
{
    use TransformsTypes;

    public function transform(ReflectionClass $class, string $name): null|TransformedType
    {
        $missingSymbols = new MissingSymbolsCollection();

        $propLines = [];
        $actionLines = [];

        $page = Viper::pageComponentFromCompiledPath($class->getFileName());

        $instances = collect($page->layouts)->push($page)->map(fn(PageComponent $page) => $page->pageInstance());

        foreach ($instances as $instance) {
            $reflect = new \ReflectionClass($instance);
            foreach ($reflect->getMethods() as $method) {
                $propAttributes = $method->getAttributes(Prop::class);

                if (!empty($propAttributes)) {
                    $propLines[] = "{$method->getName()}: {$this->reflectionToTypeScript($method, $missingSymbols)}";
                }

                $actions = $method->getAttributes(Action::class);

                if (!empty($actions)) {
                    $actionLines[] = $this->transformAction($method, $missingSymbols);
                }
            }
        }

        $params = PageComponent::parseRouteParameters($class->getFileName())
            ->map(fn($key) => "{$key}: string")
            ->toArray();

        $definition =
            '{ props: {' .
            implode(';', $propLines) .
            '}; actions: {' .
            implode(';', $actionLines) .
            '}; params: {' .
            implode(';', $params) .
            '}; }';

        return TransformedType::create($class, $name, $definition, $missingSymbols);
    }

    public function transformAction(\ReflectionMethod $method, MissingSymbolsCollection $missingSymbols): string
    {
        $returnType = $this->reflectionToTypeScript($method, $missingSymbols);

        $argType = 'any';
        foreach ($method->getparameters() as $parameter) {
            if ($parameter->getType()->isBuiltin()) {
                continue;
            }
            $classReflect = new \ReflectionClass($parameter->getType()->getName());
            if ($classReflect->isSubclassOf('\\Spatie\\LaravelData\\Data')) {
                $argType = $missingSymbols->add($classReflect->getName());
            } elseif ($classReflect->isSubclassOf(FormRequest::class)) {
                // todo: how should we get the dto from form request
            }
        }

        return "{$method->getName()}: { args: {$argType}, result: {$returnType} }";
    }
}
