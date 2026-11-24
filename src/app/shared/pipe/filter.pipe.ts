import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filter', standalone: true })
export class FilterPipe implements PipeTransform {
  transform<T>(items: T[] | null | undefined, term: string): T[] {
    if (!items || !term?.trim()) return items ?? [];
    const query = term.trim().toLowerCase();
    return items.filter(item => Object.values(item as object).some(value => String(value).toLowerCase().includes(query)));
  }
}
