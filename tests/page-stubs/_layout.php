<?php

return new class {
    #[\Ozmos\Viper\Attrs\Prop]
    public function rootLayoutProp()
    {
        return 'root layout prop';
    }

    #[\Ozmos\Viper\Attrs\Action]
    public function rootLayoutAction()
    {
        return 'root layout action';
    }
};
