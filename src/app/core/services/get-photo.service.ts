/* eslint-disable arrow-body-style */
import { inject, Injectable } from '@angular/core';
import { FALLBACK_IMAGE } from '../utils/base-constants';
import { getGatewayApiBaseUrl } from '../gateway-config';

@Injectable({ providedIn: 'root' })
export class GetPhotoService {

    private readonly url = getGatewayApiBaseUrl();

    public photoLink(photo: string): string {

        if (photo === null || photo === undefined || photo === '') {
            return FALLBACK_IMAGE;
        }

        if (photo.startsWith('http://') || photo.startsWith('https://')) {
            return photo;
        }

        if (photo.startsWith('data:image/')) {
            return photo;
        }

        return `${this.url}/photos/${photo}.jpg`;

    }

    public companyLogo(id: string): string {
        return `${this.url}/company-logo/${id}.jpg`;
    }

}
