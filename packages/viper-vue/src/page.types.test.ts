import { expectType } from "tsd";
import { type Ref, ref } from "vue";
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
  };
  params: {};
};

const page = usePage<PageTest>();

// @ts-expect-error - key doesn't exist
page.useQuery("doesntExist");

const scalarQuery = page.useQuery("scalarProp");
expectType<number>(scalarQuery.data.value);

const objectQuery = page.useQuery("objectProp");
expectType<{ id: number }>(objectQuery.data.value);

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
    console.log(data.something.other);
  },
});
noTypeMutation.mutate({ whatever: true });

const argOnlyMutation = page.useMutation("argOnly", {
  onSuccess(data) {
    console.log(data.is.untyped);
  },
});
// @ts-expect-error - wrong key provided
argOnlyMutation.mutate({ wrongKey: true });

// actual type works without errors
argOnlyMutation.mutate({ id: 1 });

const resultOnlyMutation = page.useMutation("resultOnly", {
  onSuccess(data) {
    // @ts-expect-error cannot access properties that dont exist on the result type
    console.log(data.is.typed);

    // actual type works without errors
    console.log(data.id);
  },
});

const argsAndResult = page.useMutation("argsAndResult", {
  onSuccess(data) {
    // @ts-expect-error cannot access properties that dont exist on the result type
    console.log(data.is.typed);

    // actual type works without errors
    console.log(data.two);
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
