import { expectType } from "tsd";
import { usePage } from "./page";

type PageTest = {
  props: {
    scalarProp: {
      result: number;
      bindings: [];
    };
    objectProp: {
      result: { id: number };
      bindings: [];
    };
    bindingProp: {
      result: number;
      bindings: ["one"];
    };
    multiBindingProp: {
      result: number;
      bindings: ["one", "two"];
    };
    anyProp: {
      result: any;
      bindings: [];
    };
  };
  actions: {
    noTypes: {
      args: any;
      result: any;
      bindings: [];
    };
    argOnly: {
      args: { id: number };
      result: any;
      bindings: [];
    };
    resultOnly: {
      args: any;
      result: { id: number };
      bindings: [];
    };
    argsAndResult: {
      args: { one: number };
      result: { two: number };
      bindings: [];
    };
    bindings: {
      args: any;
      result: any;
      bindings: ["something"];
    };
    multipleArgs: {
      args: { one: number; two: number };
      result: any;
      bindings: [];
    };
  };
  params: {
    something: string;
  };
};

const page = usePage<PageTest>();

// @ts-expect-error - key doesn't exist
page.useQuery("doesntExist");

const scalarQuery = page.useQuery("scalarProp");
expectType<number>(scalarQuery.data);

const objectQuery = page.useQuery("objectProp");
expectType<{ id: number }>(objectQuery.data);

page.useQuery("scalarProp", {
  // @ts-expect-error - binding provided to query that doesnt need bindings
  bind: {
    something: 1,
  },
});

// @ts-expect-error - binding not provided
page.useQuery("bindingProp");

page.useQuery("bindingProp", {
  bind: {
    one: "1",
  },
});

// @ts-expect-error - all bindings not provided
page.useQuery("multiBindingProp");

page.useQuery("multiBindingProp", {
  // @ts-expect-error - some bindings provided but not all
  bind: {
    one: "1",
  },
});

const anyQuery = page.useQuery("anyProp");
// since the prop is any we should be able to freely chain off it without errors
anyQuery.data.value.something.other;

// no types provided so we can pass anything to mutate and data
const noTypeMutation = page.useMutation("noTypes", {
  onSuccess(data) {
    void data.something.other;
  },
});
noTypeMutation.mutate({ whatever: true });

const argOnlyMutation = page.useMutation("argOnly", {
  onSuccess(data) {
    void data.is.untyped;
  },
});
// @ts-expect-error - wrong key provided
argOnlyMutation.mutate({ wrongKey: true });

// actual type works without errors
argOnlyMutation.mutate({ id: 1 });

const resultOnlyMutation = page.useMutation("resultOnly", {
  onSuccess(data) {
    // @ts-expect-error cannot access properties that dont exist on the result type
    void data.is.typed;

    // actual type works without errors
    void data.id;
  },
});

const argsAndResult = page.useMutation("argsAndResult", {
  onSuccess(data) {
    // @ts-expect-error cannot access properties that dont exist on the result type
    void data.is.typed;

    // actual type works without errors
    void data.two;
  },
});

// @ts-expect-error - wrong key provided
argsAndResult.mutate({ wrongKey: true });

// actual type works without errors
argsAndResult.mutate({ one: 1 });

// @ts-expect-error - bindings required
page.useMutation("bindings");

page.useMutation("bindings", {
  bind: {
    // @ts-expect-error - wrong binding passed
    wrongKey: 1,
  },
});

// actual binding provides no errors
page.useMutation("bindings", {
  bind: {
    something: 1,
  },
});

// @ts-expect-error - param key doesnt exist
void page.params.value.other;

expectType<string>(page.params.something);

const multipleArgsMutation = page.useMutation("multipleArgs");

// @ts-expect-error - no args passed
multipleArgsMutation.mutate();

// @ts-expect-error - only 1 args passed
multipleArgsMutation.mutate({ one: 1 });

// works fine both args passed
multipleArgsMutation.mutate({ one: 1, two: 2 });

const multipleArgsForm = page.useForm("multipleArgs", {
  state: {
    one: 1,
    two: 2,
  },
});

// works fine without args because it will use the state provided
multipleArgsForm.mutate();

// allows overriding only a single field
multipleArgsForm.mutate({ one: 1 });
