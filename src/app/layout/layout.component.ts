import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component'; 
import { SidenavComponent } from './sidenav/sidenav.component';

@Component({
    selector: 'ant-layout',
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    imports: [RouterOutlet, HeaderComponent,  SidenavComponent],

})
export class LayoutComponent {
    readonly sidebarCollapsed = signal(false);
    readonly darkMode = signal(typeof localStorage === 'undefined' || localStorage.getItem('sorte-builder-theme') !== 'light');

    toggleSidebar(): void {
        this.sidebarCollapsed.update(value => !value);
    }

    toggleTheme(): void {
        this.darkMode.update(value => !value); localStorage?.setItem('sorte-builder-theme', this.darkMode() ? 'dark' : 'light');
    }
}
