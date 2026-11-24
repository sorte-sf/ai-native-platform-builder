import { Injectable } from "@angular/core";
import { Translation, TranslocoLoader } from "@jsverse/transloco";
import { of } from 'rxjs';
import en from '../../public/i18n/en.json';
import tr from '../../public/i18n/tr.json';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
    getTranslation(lang: string) {
        return of((lang === 'tr' ? tr : en) as Translation);
    }
}
