import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EnumAsListDto } from '@core/models/enum-as-list-dto.interface';

@Injectable({ providedIn: 'root' })
export class EnumLookupService {

    private _httpClient = inject(HttpClient);

    getEnumAsList(enumObj: any): EnumAsListDto[] {
        return Object.keys(enumObj)
            .filter(key => isNaN(Number(key))) // Filter out numeric keys
            .map(key => ({ key, value: enumObj[key].toString() })); // Convert value to string
    }

}
