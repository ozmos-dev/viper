<?php

return new #[\Ozmos\Viper\Attrs\Name('login')] class
{
    #[\Ozmos\Viper\Attrs\Prop]
    public function loginProp()
    {
        return 'login prop';
    }

    #[\Ozmos\Viper\Attrs\Action]
    public function loginAction()
    {
        return 'login action';
    }
};
