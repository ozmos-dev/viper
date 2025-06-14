<?php

return new #[\Ozmos\Viper\Attrs\Name('auth.')]
#[\Ozmos\Viper\Attrs\Middleware(['guest'])]
class {
    #[\Ozmos\Viper\Attrs\Prop]
    public function authLayoutProp()
    {
        return 'auth layout prop';
    }

    #[\Ozmos\Viper\Attrs\Action]
    public function authLayoutAction()
    {
        return 'auth layout action';
    }
};
