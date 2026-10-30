export const TREE_MUTATION_TOKEN: unique symbol = Symbol(
  "SvgDocument tree mutation",
);

export type TreeMutationToken = typeof TREE_MUTATION_TOKEN;
