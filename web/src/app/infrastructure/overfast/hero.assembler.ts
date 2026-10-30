import { Hero, Role } from '@domain/hero/hero';

/** Hero as OverFast API returns it in /heroes. */
export interface HeroResource {
  key: string;
  name: string;
  portrait: string;
  role: Role;
  subrole?: string;
}

/** Converts OverFast API heroes into domain entities (and back, to keep a cached copy). */
export class HeroAssembler {
  static toEntityFromResource(resource: HeroResource): Hero {
    return new Hero(resource.key, resource.name, resource.portrait, resource.role, resource.subrole);
  }

  static toEntitiesFromResponse(response: HeroResource[]): Hero[] {
    return response.map((resource) => HeroAssembler.toEntityFromResource(resource));
  }

  static toResourceFromEntity(hero: Hero): HeroResource {
    const { key, name, portrait, role, subrole } = hero;
    return { key, name, portrait, role, subrole };
  }

  static toResourcesFromEntities(heroes: Hero[]): HeroResource[] {
    return heroes.map((hero) => HeroAssembler.toResourceFromEntity(hero));
  }
}
