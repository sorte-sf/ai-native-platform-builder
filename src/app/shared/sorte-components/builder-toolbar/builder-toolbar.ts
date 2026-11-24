import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoModule } from '@jsverse/transloco';
import { faDesktop, faTabletScreenButton, faMobileScreenButton, faPlay, faFloppyDisk, faArrowLeft, faExpand } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'ant-builder-toolbar',
  styleUrl: './builder-toolbar.css',
  templateUrl: './builder-toolbar.html',
  imports: [
    CommonModule,
    FontAwesomeModule,

    MatButtonModule,
    MatTooltipModule,
    TranslocoModule,
  ],
})
export class BuilderToolbar {

  showDesktopViewButton = input<boolean>(true);
  showTabletViewButton = input<boolean>(true);
  showMobileViewButton = input<boolean>(true);
  showFullScreenButton = input<boolean>(false);
  showPreviewButton = input<boolean>(false);

  onDesktopViewButtonClicked = output();
  onTabletViewButtonClicked = output();
  onMobileViewButtonClicked = output();
  onFullScreenButtonClicked = output();
  onPreviewButtonClicked = output();

  readonly toolbarIcons = {
    desktop: faDesktop,
    tablet: faTabletScreenButton,
    mobile: faMobileScreenButton,
    preview: faPlay,
    expand: faExpand,
    save: faFloppyDisk,
    back: faArrowLeft
  };


}
