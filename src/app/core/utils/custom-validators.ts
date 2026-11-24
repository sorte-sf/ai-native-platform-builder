import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MISSMATCH_VALIDATOR = (controlName: string, matchingControlName: string): ValidatorFn =>
    (control: AbstractControl): ValidationErrors | null => {
        const value = control.get(controlName)?.value;
        const matchingValue = control.get(matchingControlName)?.value;
        return value === matchingValue ? null : { mismatch: true };
    };


export const TRUTHY_VALIDATOR = (keys: string[]): ValidatorFn =>
    (control: AbstractControl): ValidationErrors | null => keys.some(k => control.get(k)?.value === true) ? null : { notValid: true };


export const EMPTY_LIST_VALIDATOR = () =>
    (control: AbstractControl): ValidationErrors | null => !Array.isArray(control.value) || !control.value.length ? { listEmpty: true } : null;

