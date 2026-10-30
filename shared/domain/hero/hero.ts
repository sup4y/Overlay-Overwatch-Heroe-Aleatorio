export type Role = 'tank' | 'damage' | 'support';

/**
 * Overwatch hero that can come up in a draw.
 * Role and subrole are codes; each interface shows them in its own language.
 */
export class Hero {
  constructor(
    readonly key: string,
    readonly name: string,
    readonly portrait: string,
    readonly role: Role,
    readonly subrole?: string,
  ) {}
}
