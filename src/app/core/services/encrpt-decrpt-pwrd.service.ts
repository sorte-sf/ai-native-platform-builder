import { Injectable } from '@angular/core';

import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncrptDecrptPwrdService {

    constructor() { }

    public encrptPwrd(value: string): any {

        const MY_IV = this.generateSalt();

        const iv = CryptoJS.enc.Utf8.parse(MY_IV);

        const result = CryptoJS.AES.encrypt(value, MY_IV,
            {
                keySize: 128 / 8,
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }).toString();

        localStorage.setItem('Vipasx.salt', MY_IV);

        return result;

    }

    public dencrptPwrd(value: string): any {

        const key = localStorage.getItem('Vipasx.salt') || '';

        const iv = CryptoJS.enc.Utf8.parse(key);

        const result = CryptoJS.AES.decrypt(value, key, {
            keySize: 128 / 8,
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        return result;

    }

    private generateSalt(): any {
        const arr32 = Uint32Array.of(0x12345678);
        return crypto.getRandomValues(arr32).toString();
    }

}
