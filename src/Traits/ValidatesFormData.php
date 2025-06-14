<?php

namespace Ozmos\Viper\Traits;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;

trait ValidatesFormData
{
    public static function withValidator(Validator $validator): void
    {
        $data = $validator->getData();
        $files = collect($data)->filter(fn($item) => $item instanceof UploadedFile);
        $validator->setData([
            ...json_decode($data['state'], true),
            ...$files->toArray(),
        ]);
    }
}
