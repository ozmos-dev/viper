<?php

namespace Ozmos\Viper\Attrs;

use Spatie\LaravelData\Attributes\InjectsPropertyValue;
use Spatie\LaravelData\Support\Creation\CreationContext;
use Spatie\LaravelData\Support\DataProperty;

#[\Attribute(\Attribute::TARGET_PROPERTY)]
class FormDataValue implements InjectsPropertyValue
{
  public function resolve(DataProperty $dataProperty, mixed $payload, array $properties, CreationContext $creationContext): mixed
  {
    // todo: don't decode every time
    $payload = json_decode($payload['state'], true);

    return data_get($payload, $dataProperty->name);
  }

  public function shouldBeReplacedWhenPresentInPayload(): bool
  {
    return false;
  }
}
