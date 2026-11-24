export class IconModel {
    id: string;
    name: string;
    displayName: string;
    prefix: 'fas' | 'far' | 'fal' | 'fat' | 'fad' | 'fab' | 'fak';
    icon: any;
    iconString: string;

    constructor(prefix: 'fas' | 'far' | 'fal' | 'fat' | 'fad' | 'fab' | 'fak', name: string) {

        this.prefix = prefix;
        this.name = name;
        this.displayName = name.replace(/(^\w)/g, g => g[0].toUpperCase()).replace(/([-_]\w)/g, g => ' ' + g[1].toUpperCase()).trim();
        this.icon = [prefix, name];
        this.iconString = `['${prefix}','${name}']`;

        this.id = `${this.prefix }.${this.name}`;
    }

}
