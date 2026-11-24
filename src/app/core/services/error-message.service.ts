import { HttpErrorResponse } from "@angular/common/http";

export function setErrorMessage(err: HttpErrorResponse, dataName?: string): string {
    let errorMessage = '';
    let name = dataName ?? '';
    if (err) {
        if (err.error instanceof ErrorEvent) {
            errorMessage = `An error occurred: ${ err.error.message }`;
        } else {
            const status = err.status;
            if (status === 401) errorMessage = `You are not authorized to access ${ name } data.`;
            if (status === 404) errorMessage = `${ name } data was not found.Please try again later.`;
            if (status > 500 && status < 600) errorMessage = `The server isn't currently working. Please try again later.`;
        }
    }
    return errorMessage;
}
