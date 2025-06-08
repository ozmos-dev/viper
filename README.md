# Viper

> [!WARNING]
> Viper is still in early development (but functional!).
> 
> You may (definitely) encounter issues or sharp edges.

The full documentation is available at [https://viper.ozmos.dev](https://viper.ozmos.dev) 👈

---

Viper combines Laravel, Vue, `@tanstack/vue-query`, and `spatie/typescript-transformer` to help you build applications rapidly.

Get up and running with a new project in a single command:

```
laravel new app --using=ozmos/viper-vue-shadcn
```

Wondering what it looks like? Here's a preview of an automatically registered route with type-safe queries and mutations.

```vue
// resources/js/pages/users/[user]/edit.vue
<template>
  <form method="post" @submit.prevent="mutate()">
    <label>
      Your Name
      <input v-model="state.name" />
    </label>
    <button type="submit" :disabled="isPending">Update Profile</button>
  </form>
</template>

<script setup lang="ts">
import { usePage } from '@ozmos/viper-vue';

const page = usePage<ViperGen.Example>();

const { data: user } = page.useProp('user');

const { mutate, state, isPending } = page.useForm('updateProfile', {
  state: {
    name: user.value.name,
  },
  onSuccess(data) {
    alert(`Updated name to ${data.name}`);
  }
});
</script>

<php>
use Ozmos\Viper\Attrs\Prop;
use Ozmos\Viper\Attrs\Action;
use Illuminate\Http\Request;
use App\Dto\UserDto;
use App\Dto\UpdateUserDto;
use App\Models\User;

return new class {
  #[Prop]
  public function user(User $user): UserDto
  {
    return UserDto::from($user);
  }

  #[Action]
  public function updateProfile(User $user, UpdateUserDto $data): UserDto
  {
    $user->update($data->toArray());

    return UserDto::from($user);
  }
};
</php>
```
