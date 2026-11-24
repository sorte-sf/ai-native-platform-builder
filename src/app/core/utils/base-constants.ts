
export const DATE_FMT = 'dd.MM.yyyy';

export const DATE_TIME_FMT = `${DATE_FMT} HH:mm`;

export const LANGUAGE_STORAGE_KEY = 'lang';

export const MAC_ADDRESS_PATTERN = new RegExp('^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$');

export const PASSWORD_PATTERN = new RegExp('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$');

export const PHONE_PATTERN = '^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$';  // ^[2-9]\d{2}-\d{3}-\d{4}$   ^\(\d{3}\)\s\d{3}-\d{4}$

export const EMAIL_PATTERN = "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$";

export const URL_PATTERN ="^(https?|ftp):\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$";

export const FALLBACK_LANGUAGE = 'tr';

export const DEFAULT_PAGE_SIZE = 30;
export const DEFAULT_MAX_PAGE_SIZE = 30;
export const DEFAULT_LIVE_MAX_ITEMS = 100;
export const DEFAULT_ALLOWED_PAGING = [30, 50, 100, 200];

export const FALLBACK_IMAGE = './images/logo/sm-logo.png';

export const MAX_DASHBOARD_COUNT = 6;

export const THEME_KEY = 'VipasX.ThemeSettings';
export const TOKEN_KEY = 'VipasX.Token';

export const ONLY_YEAR_MONTH_FORMATS = {
    parse: {
        dateInput: 'MM/YYYY',
    },
    display: {
        dateInput: 'MM/YYYY',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
    },
};

export const DAY_MONTH_YEAR_FORMATS = {
    parse: {
        dateInput: 'DD.MM.YYYY',
    },
    display: {
        dateInput: 'DD.MM.YYYY',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
    },
};

export class Guid {
    static new(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            // eslint-disable-next-line no-bitwise
            const r = (Math.random() * 16) | 0;

            // eslint-disable-next-line no-bitwise
            const v = c === 'x' ? r : (r & 0x3) | 0x8;

            // const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);

            return v.toString(16);
        });
    }
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
