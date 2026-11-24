import { Injectable } from '@angular/core';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

@Injectable({
    providedIn: 'root'
})
export class UtilityService {

    constructor() { }

    public resolveIcon(iconData: string, fallback: string = '["fal","question"]'): IconProp {

        let icon: IconProp;
        try {
            if (iconData) {
                const iconConfig = `${iconData}`.replace(/'/g, '"');

                if (iconConfig) {
                    icon = JSON.parse(iconConfig);
                    return icon;
                }
            }
        }
        catch { }

        return JSON.parse(fallback.replace(/'/g, '"'));
    }


}
