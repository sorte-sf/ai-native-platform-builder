import { Injectable } from '@angular/core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { fal } from '@fortawesome/pro-light-svg-icons';
import { IconModel } from '../models/icon-model';

@Injectable({
    providedIn: 'root'
})
export class IconService {

    falList: IconModel[] = [];
    list: IconModel[] = [];

    constructor() {

        const iconPacks = [
            { list: this.falList, prefix: fas },
            { list: this.falList, prefix: fal }
        ];

        iconPacks.forEach((iconPack): void => {
            const propNames = Object.getOwnPropertyNames(iconPack.prefix);
            propNames.forEach(
                (propName) => {
                    const propValue = iconPack.prefix[propName];
                    if (propValue) {
                        const icon = new IconModel('fas', propValue.iconName);
                        icon.icon = propValue;
                        iconPack.list.push(icon);
                    }
                }
            );
        });

        this.list = iconPacks.flatMap(pack => pack.list).sort((a, b) => a.displayName.localeCompare(b.displayName));

    }
}


/*
import { Injectable } from '@angular/core';
import { fal } from '@fortawesome/pro-light-svg-icons';
import { IconModel } from '../models/icon-model';

@Injectable({
    providedIn: 'root'
})
export class IconService {

    falList: IconModel[] = [];
    list: IconModel[] = [];

    constructor() {

        const iconPacks = [
            { list: this.falList, prefix: fal },
            
        ];

        iconPacks.forEach((iconPack): void => {
            const propNames = Object.getOwnPropertyNames(iconPack.prefix);
            propNames.forEach(
                (propName) => {
                    const propValue = iconPack.prefix[propName];
                    if (propValue) {
                        const icon = new IconModel('fas', propValue.iconName);
                        icon.icon = propValue;
                        iconPack.list.push(icon);
                    }
                }
            );
        });

        this.list = iconPacks.flatMap(pack => pack.list).sort((a, b) => a.displayName.localeCompare(b.displayName));

    }
}


*/
