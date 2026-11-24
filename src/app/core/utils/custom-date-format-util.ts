export class CustomDateFormat {
    showTime = true;

    constructor() { }

    get display(): any {
        return this.showTime ?
            {
                dateInput: 'LL HH:mm',
                monthYearLabel: 'MMM YYYY',
                dateA11yLabel: 'LL HH:mm',
                monthYearA11yLabel: 'MMMM YYYY',
            } : {
                dateInput: 'LL',
                monthYearLabel: 'MMM YYYY',
                dateA11yLabel: 'LL',
                monthYearA11yLabel: 'MMMM YYYY',
            };
    }

    get parse(): any {
        return this.showTime ? {
            dateInput: 'LL HH:mm',
        } : {
            dateInput: 'LL',
        };
    }

}
