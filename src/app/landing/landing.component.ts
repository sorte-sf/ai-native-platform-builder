import { AfterViewInit, Component, ElementRef, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageSelectorComponent } from '@app/shared/sorte-components/language-selector/language-selector.component';
import { LogoWidgetComponent } from '@app/shared/sorte-components/logo-widget/logo-widget.component';
import { TranslocoModule, } from '@jsverse/transloco';

@Component({
  selector: 'ant-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  imports: [RouterLink, TranslocoModule, LanguageSelectorComponent, LogoWidgetComponent],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    }), { threshold: 0.18 });
    this.host.nativeElement.querySelectorAll('.reveal').forEach((element: Element) => this.observer!.observe(element));
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
