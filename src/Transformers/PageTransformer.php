<?php

namespace Ozmos\Viper\Transformers;

use Illuminate\Foundation\Http\FormRequest;
use Ozmos\Viper\Attrs\Action;
use Ozmos\Viper\Attrs\Bind;
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
                    $returnType = $this->reflectionToTypeScript($method, $missingSymbols);
                    $bindings = [];

                    foreach ($method->getParameters() as $param) {
                        $attrs = $param->getAttributes(Bind::class);

                        if (empty($attrs)) {
                            continue;
                        }

                        $bindings[] = $param->getName();
                    }
                    $bindingType = json_encode($bindings);
                    $propLines[] = "{$method->getName()}: { result: ".$returnType."; bindings: $bindingType }";
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

        // bindings = { colour: string|number, name: string|number; }
        // loop over all

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
          $bindings = [];

        foreach ($method->getparameters() as $parameter) {
            if ($parameter->getType()->isBuiltin()) {
                continue;
            }

            $attrs = $parameter->getAttributes(Bind::class);

            if (!empty($attrs)) {
              $bindings[] = $parameter->getName();
            }

            $classReflect = new \ReflectionClass($parameter->getType()->getName());
            if ($classReflect->isSubclassOf('\\Spatie\\LaravelData\\Data')) {
                $argType = $missingSymbols->add($classReflect->getName());
            } elseif ($classReflect->isSubclassOf(FormRequest::class)) {
                // todo: how should we get the dto from form request
            }
        }

      $bindingType = json_encode($bindings);

        return "{$method->getName()}: { args: {$argType}; result: {$returnType}; bindings: $bindingType; }";
    }
}
