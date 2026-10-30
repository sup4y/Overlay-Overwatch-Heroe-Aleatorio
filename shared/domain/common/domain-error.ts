export type ErrorParams = Record<string, string | number>;

/**
 * Business rule error. It carries a code (not a text) so each interface can show
 * it in its own language: the web translates it as `errors.<code>`.
 */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    readonly params: ErrorParams = {},
  ) {
    super(code);
    this.name = new.target.name;
  }
}
